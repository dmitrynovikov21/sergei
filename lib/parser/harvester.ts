/**
 * Harvester Engine - Main content processing pipeline
 * 
 * Handles:
 * - Fetching posts from Instagram via Apify
 * - Deduplication (update stats for existing, process new)
 * - AI Processing (Claude Vision for headlines, Whisper for transcription)
 */

import { prisma } from "@/lib/db"
import {
    scrapeInstagram,
    extractHeadlineFromCover,
    extractUsername,
    type ApifyInstagramPost
} from "./apify-service"
import OpenAI from "openai"
import fs from "fs"
import path from "path"
import os from "os"

// ==========================================
// Configuration
// ==========================================

const openai = new OpenAI()
const DEFAULT_DAYS_LIMIT = 30

// ==========================================
// Main Harvester Functions
// ==========================================

/**
 * Process a single tracking source:
 * - Fetch posts from Instagram
 * - Deduplicate and update/create content items
 * - Trigger AI processing for new items above threshold
 */
export async function processTrackingSource(sourceId: string): Promise<{
    fetched: number
    saved: number
    updated: number
    skipped: number
    skipReasons: { reason: string; count: number }[]
    errors: string[]
}> {
    const result = {
        fetched: 0,
        saved: 0,
        updated: 0,
        skipped: 0,
        skipReasons: [] as { reason: string; count: number }[],
        errors: [] as string[]
    }

    const skipCounts: Record<string, number> = {}

    // 1. Get source with settings
    const source = await prisma.trackingSource.findUnique({
        where: { id: sourceId },
        include: { dataset: true }
    })

    if (!source) {
        throw new Error(`TrackingSource not found: ${sourceId}`)
    }

    const username = source.username || extractUsername(source.url)
    if (!username) {
        throw new Error(`Could not extract username from URL: ${source.url}`)
    }

    // 2. Scrape Instagram
    console.log(`[Harvester] Scraping @${username} (limit: ${source.fetchLimit})`)

    let posts: ApifyInstagramPost[]
    try {
        posts = await scrapeInstagram(username, source.fetchLimit)
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error"
        result.errors.push(`Scrape failed: ${errorMsg}`)
        return result
    }

    result.fetched = posts.length
    console.log(`[Harvester] Found ${posts.length} posts`)

    // 3. Process each post
    for (const post of posts) {
        try {
            const postResult = await processPost(
                post,
                source.id,
                source.datasetId,
                source.minViewsFilter,
                source.daysLimit || DEFAULT_DAYS_LIMIT,
                source.contentTypes || "Video,Sidecar,Image"
            )

            if (postResult.status === "saved") {
                result.saved++
            } else if (postResult.status === "updated") {
                result.updated++
            } else if (postResult.status === "skipped") {
                result.skipped++
                skipCounts[postResult.reason] = (skipCounts[postResult.reason] || 0) + 1
            }
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : "Unknown error"
            result.errors.push(`Post ${post.id}: ${errorMsg}`)
        }
    }

    // Convert skip counts to array
    result.skipReasons = Object.entries(skipCounts)
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count)

    // 4. Update lastScrapedAt
    await prisma.trackingSource.update({
        where: { id: sourceId },
        data: { lastScrapedAt: new Date() }
    })

    return result
}

/**
 * Process a single post - deduplicate and trigger AI if needed
 * Returns status and reason for tracking
 */
type PostResult =
    | { status: "saved" }
    | { status: "updated" }
    | { status: "skipped"; reason: string }

async function processPost(
    post: ApifyInstagramPost,
    sourceId: string,
    datasetId: string,
    minViews: number,
    daysLimit: number,
    contentTypes: string
): Promise<PostResult> {
    // Log all view-related fields from Apify for debugging
    console.log(`[Harvester] Post ${post.id || post.shortCode} view fields:`, {
        videoPlayCount: post.videoPlayCount,
        playCount: post.playCount,
        videoViewCount: post.videoViewCount,
        viewCount: post.viewCount,
        // Log any additional fields that might contain views
        raw: JSON.stringify(post).includes('play') ? 'has play field' : 'no play field'
    })

    // Try multiple view fields - prioritize videoPlayCount (Instagram's current standard)
    const views = post.videoPlayCount || post.playCount || post.videoViewCount || post.viewCount || 0
    const instagramId = post.id || post.shortCode
    const publishedAt = new Date(post.timestamp)

    // Content Type Filter
    const allowedTypes = contentTypes.split(",").map(t => t.trim())
    if (!allowedTypes.includes(post.type)) {
        console.log(`[Harvester] Skipping ${instagramId} (Type: ${post.type} not in ${contentTypes})`)
        return { status: "skipped", reason: `Тип ${post.type} не выбран` }
    }

    // Date Filter: Skip if older than limit
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysLimit)

    if (publishedAt < cutoffDate) {
        console.log(`[Harvester] Skipping ${instagramId} (Too old: ${publishedAt.toISOString().split('T')[0]})`)
        return { status: "skipped", reason: `Старше ${daysLimit} дней` }
    }

    // Check if already exists IN THIS DATASET
    const existing = await prisma.contentItem.findFirst({
        where: {
            instagramId,
            datasetId  // Check only in current dataset
        }
    })

    if (existing) {
        // Update stats only
        await prisma.contentItem.update({
            where: { id: existing.id },
            data: {
                views,
                likes: post.likesCount,
                comments: post.commentsCount
            }
        })
        console.log(`[Harvester] Updated stats for ${instagramId}`)
        return { status: "updated" }
    }

    // New post - check if meets threshold
    if (views < minViews) {
        console.log(`[Harvester] Skipping ${instagramId} (${views} < ${minViews} views)`)
        return { status: "skipped", reason: `${views} < ${minViews} просмотров` }
    }

    // Create new content item
    const contentItem = await prisma.contentItem.create({
        data: {
            instagramId,
            originalUrl: post.url,
            sourceUrl: `https://instagram.com/${post.ownerUsername}`,
            coverUrl: post.displayUrl,
            videoUrl: post.videoUrl,
            views,
            likes: post.likesCount,
            comments: post.commentsCount,
            publishedAt: new Date(post.timestamp),
            datasetId,
            isProcessed: false,
            isApproved: false
        }
    })

    console.log(`[Harvester] Created content item ${contentItem.id}`)

    // Trigger AI processing immediately (links expire)
    await processContentItemAI(contentItem.id)

    return { status: "saved" }
}

/**
 * Run AI processing on a content item
 * - Extract headline from cover via Claude Vision
 * - Transcribe audio via Whisper (if video)
 */
export async function processContentItemAI(contentItemId: string): Promise<void> {
    const item = await prisma.contentItem.findUnique({
        where: { id: contentItemId }
    })

    if (!item) {
        throw new Error(`ContentItem not found: ${contentItemId}`)
    }

    let headline: string | null = null
    let transcript: string | null = null
    let processingError: string | null = null

    // 1. Extract headline from cover
    if (item.coverUrl) {
        try {
            console.log(`[AI] Extracting headline from cover...`)
            headline = await extractHeadlineFromCover(item.coverUrl)
            console.log(`[AI] Headline: "${headline}"`)
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : "Vision error"
            processingError = `Headline extraction failed: ${errorMsg}`
            console.error(`[AI] ${processingError}`)
        }
    }

    // 2. Transcribe video audio
    if (item.videoUrl) {
        try {
            console.log(`[AI] Transcribing video audio...`)
            transcript = await transcribeVideo(item.videoUrl)
            console.log(`[AI] Transcript length: ${transcript?.length || 0} chars`)
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : "Whisper error"
            processingError = processingError
                ? `${processingError}; Transcription failed: ${errorMsg}`
                : `Transcription failed: ${errorMsg}`
            console.error(`[AI] Transcription failed: ${errorMsg}`)
        }
    }

    // 3. Update content item
    await prisma.contentItem.update({
        where: { id: contentItemId },
        data: {
            headline,
            transcript,
            isProcessed: true,
            processingError
        }
    })

    console.log(`[AI] Processing complete for ${contentItemId}`)
}

/**
 * Transcribe video audio using OpenAI Whisper
 */
async function transcribeVideo(videoUrl: string): Promise<string> {
    // Download video to temp file
    const tempDir = os.tmpdir()
    const tempFile = path.join(tempDir, `video_${Date.now()}.mp4`)

    try {
        // Download video
        const response = await fetch(videoUrl)
        if (!response.ok) {
            throw new Error(`Failed to download video: ${response.status}`)
        }

        const buffer = Buffer.from(await response.arrayBuffer())
        fs.writeFileSync(tempFile, buffer)

        // Transcribe with Whisper
        const transcription = await openai.audio.transcriptions.create({
            file: fs.createReadStream(tempFile),
            model: "whisper-1",
            language: "ru" // Russian language
        })

        return transcription.text

    } finally {
        // CRITICAL: Always delete temp file
        if (fs.existsSync(tempFile)) {
            fs.unlinkSync(tempFile)
        }
    }
}

// ==========================================
// Batch Processing
// ==========================================

/**
 * Process all active tracking sources
 */
export async function harvestAllSources(): Promise<{
    totalProcessed: number
    totalUpdated: number
    totalSkipped: number
    errors: string[]
}> {
    const sources = await prisma.trackingSource.findMany({
        where: { isActive: true }
    })

    const result = {
        totalProcessed: 0,
        totalUpdated: 0,
        totalSkipped: 0,
        errors: [] as string[]
    }

    for (const source of sources) {
        console.log(`\n[Harvester] Processing source: ${source.url}`)

        try {
            const r = await processTrackingSource(source.id)
            result.totalProcessed += r.saved
            result.totalUpdated += r.updated
            result.totalSkipped += r.skipped
            result.errors.push(...r.errors)
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : "Unknown"
            result.errors.push(`Source ${source.id}: ${errorMsg}`)
        }
    }

    return result
}
