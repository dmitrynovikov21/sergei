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

    // 1. Get source with settings
    const source = await prisma.trackingSource.findUnique({
        where: { id: sourceId },
        include: { dataset: true }
    })

    if (!source) {
        throw new Error(`TrackingSource not found: ${sourceId}`)
    }

    // 0. Create Parse History Record (Start)
    const history = await prisma.parseHistory.create({
        data: {
            sourceId,
            status: "running",
            daysRange: source.daysLimit || DEFAULT_DAYS_LIMIT
        }
    })

    try {
        const skipCounts: Record<string, number> = {}

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
            const errorMsg = error instanceof Error ? error.message : "Scrape error"
            throw new Error(errorMsg)
        }

        result.fetched = posts.length
        console.log(`[Harvester] Found ${posts.length} posts`)

        // Calculate average views for virality filter
        const totalViews = posts.reduce((sum, p) => sum + (p.videoPlayCount || p.playCount || p.videoViewCount || p.viewCount || 0), 0)
        const averageViews = posts.length > 0 ? totalViews / posts.length : 0
        console.log(`[Harvester] Batch Avg Views: ${Math.round(averageViews)}`)

        // 3. Process each post
        // First pass: standard days limit (e.g. 7 or 30)
        let savedInPass = 0

        const runProcessingPass = async (overrideDaysLimit?: number) => {
            const currentDaysLimit = overrideDaysLimit || source.daysLimit || DEFAULT_DAYS_LIMIT
            console.log(`[Harvester] Processing pass with limit: ${currentDaysLimit} days`)

            for (const post of posts) {
                // Optimization: If we already saved this post in a previous pass (unlikely if logic is correct, but safe), skip?
                // Actually, we reset result.saved if we want purely fallback logic?
                // No, fallback says "If no posts found... look back".
                // So if first pass yields 0, run second pass.

                try {
                    const postResult = await processPost(
                        post,
                        source.id,
                        source.datasetId,
                        source.minViewsFilter,
                        currentDaysLimit,
                        source.contentTypes || "Video,Sidecar,Image",
                        averageViews
                    )

                    if (postResult.status === "saved") {
                        result.saved++
                        savedInPass++
                    } else if (postResult.status === "updated") {
                        result.updated++ // Don't count as 'saved' new content for fallback purposes
                    } else if (postResult.status === "skipped") {
                        result.skipped++
                        skipCounts[postResult.reason] = (skipCounts[postResult.reason] || 0) + 1
                    }
                } catch (error) {
                    const errorMsg = error instanceof Error ? error.message : "Unknown error"
                    result.errors.push(`Post ${post.id}: ${errorMsg}`)
                }
            }
        }

        await runProcessingPass()

        // Fallback: If < 5 saved and we have posts (and didn't already look back far), try extending lookback to 14 weeks (98 days)
        if (savedInPass < 5 && posts.length > 0 && (source.daysLimit || DEFAULT_DAYS_LIMIT) < 90) {
            console.log(`[Harvester] Fallback: No posts saved. extending lookback to 14 weeks (98 days)...`)
            // Reset skipped count to avoid double counting? Or just append?
            // Technically previous skips are valid for that pass. 
            // We just want to see if we can save *some*.
            // We should filter out posts already processed? processPost handles dedup (existing check).
            // But we need to retry "skipped" ones.
            // processPost checks DB. If not in DB, it proceeds to filters.

            await runProcessingPass(98) // 14 weeks
        }

        // Convert skip counts to array
        result.skipReasons = Object.entries(skipCounts)
            .map(([reason, count]) => ({ reason, count }))
            .sort((a, b) => b.count - a.count)

        // 4. Update lastScrapedAt & History Success
        await prisma.trackingSource.update({
            where: { id: sourceId },
            data: { lastScrapedAt: new Date() }
        })

        await prisma.parseHistory.update({
            where: { id: history.id },
            data: {
                status: "completed",
                completedAt: new Date(),
                postsFound: result.fetched,
                postsAdded: result.saved,
                postsSkipped: result.skipped
            }
        })

        return result

    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error"
        result.errors.push(errorMsg)

        // Update History Failure
        await prisma.parseHistory.update({
            where: { id: history.id },
            data: {
                status: "failed",
                completedAt: new Date(),
                error: errorMsg
            }
        })

        return result
    }
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
    contentTypes: string,
    averageViews: number = 0
): Promise<PostResult> {
    // Log all view-related fields from Apify for debugging
    // console.log(`[Harvester] Post ${post.id || post.shortCode} processing...`)

    // Try multiple view fields - prioritize videoPlayCount (Instagram's current standard)
    const views = post.videoPlayCount || post.playCount || post.videoViewCount || post.viewCount || 0
    const instagramId = post.id || post.shortCode
    const publishedAt = new Date(post.timestamp)

    // Content Type Filter
    const allowedTypes = contentTypes.split(",").map(t => t.trim())
    if (!allowedTypes.includes(post.type)) {
        return { status: "skipped", reason: `Тип ${post.type} не выбран` }
    }

    // Date Filter: Skip if older than limit
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysLimit)

    if (publishedAt < cutoffDate) {
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
        return { status: "updated" }
    }

    // Virality Check: 
    // Must be > minViews AND (> 1.5 * average OR average is 0)
    // If averageViews is passed, use it.

    if (views < minViews) {
        return { status: "skipped", reason: `${views} < ${minViews} просмотров` }
    }

    if (averageViews > 0 && views < (averageViews * 1.5)) {
        return { status: "skipped", reason: `Ниже виральности (${views} < ${Math.round(averageViews * 1.5)})` }
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

    // Trigger AI processing immediately
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
