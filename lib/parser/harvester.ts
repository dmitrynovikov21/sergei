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
} from "./parser-client"
import OpenAI from "openai"
import fs from "fs"
import path from "path"
import os from "os"

// ==========================================
// Configuration
// ==========================================

const openai = new OpenAI()
// Default days limit if not set on source
const DEFAULT_DAYS_LIMIT = 14

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
    const history = await prisma.parse_history.create({
        data: {
            id: crypto.randomUUID(),
            sourceId,
            status: "running",
            daysRange: source.daysLimit || DEFAULT_DAYS_LIMIT
        }
    })

    // Track detailed stats
    let filtered = 0
    let archived = 0

    try {
        const skipCounts: Record<string, number> = {}

        const username = source.username || extractUsername(source.url)
        if (!username) {
            throw new Error(`Could not extract username from URL: ${source.url}`)
        }

        // 2. Scrape Instagram using source's daysLimit setting
        const urlToScrape = source.url
        const daysLimit = source.daysLimit || DEFAULT_DAYS_LIMIT

        let posts: ApifyInstagramPost[]
        try {
            posts = await scrapeInstagram(urlToScrape, source.fetchLimit, daysLimit, source.contentTypes)
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : "Scrape error"
            throw new Error(errorMsg)
        }

        result.fetched = posts.length
        console.log(`[Harvester] Apify returned ${posts.length} posts (raw count)`)

        // Calculate average views for virality context
        const totalViews = posts.reduce((sum, p) => sum + (p.videoPlayCount || p.playCount || p.videoViewCount || p.viewCount || 0), 0)
        const averageViews = posts.length > 0 ? totalViews / posts.length : 0

        // 3. Process each post
        for (const post of posts) {
            try {
                const postResult = await processPost(
                    post,
                    source.id,
                    source.datasetId,
                    source.minViewsFilter,
                    (source as any).minLikesFilter || 0,  // NEW: separate likes filter
                    source.contentTypes || "Video,Sidecar,Image",
                    averageViews
                )

                if (postResult.status === "saved") {
                    result.saved++
                } else if (postResult.status === "updated") {
                    result.updated++
                } else if (postResult.status === "skipped") {
                    result.skipped++
                    if (postResult.reason.includes("просмотров") || postResult.reason.includes("лайков")) {
                        filtered++
                    }
                    skipCounts[postResult.reason] = (skipCounts[postResult.reason] || 0) + 1
                }
            } catch (error) {
                const errorMsg = error instanceof Error ? error.message : "Unknown error"
                result.errors.push(`Post ${post.id}: ${errorMsg}`)
            }
        }

        // 4. Auto-archive old content (14+ days)
        archived = await archiveOldContent(source.datasetId)
        if (archived > 0) {
            console.log(`[Harvester] Archived ${archived} posts older than 14 days`)
        }

        // Convert skip counts to array
        result.skipReasons = Object.entries(skipCounts)
            .map(([reason, count]) => ({ reason, count }))
            .sort((a, b) => b.count - a.count)

        // 5. Update lastScrapedAt & History Success with detailed stats
        await prisma.trackingSource.update({
            where: { id: sourceId },
            data: { lastScrapedAt: new Date() }
        })

        await prisma.parse_history.update({
            where: { id: history.id },
            data: {
                status: "completed",
                completed_at: new Date(),
                posts_found: result.fetched,
                posts_added: result.saved,
                posts_skipped: result.skipped,
                posts_filtered: filtered,
                posts_archived: archived,
                posts_updated: result.updated,
                apify_raw_count: result.fetched
            }
        })

        return result

    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error"
        result.errors.push(errorMsg)

        // Update History Failure
        await prisma.parse_history.update({
            where: { id: history.id },
            data: {
                status: "failed",
                completed_at: new Date(),
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
    minLikes: number,  // NEW: separate likes filter for Carousels
    contentTypes: string,
    averageViews: number = 0
): Promise<PostResult> {
    // Try multiple view fields - prioritize videoPlayCount (Instagram's current standard)
    const views = post.videoPlayCount || post.playCount || post.videoViewCount || post.viewCount || 0
    const likes = post.likesCount || 0
    const instagramId = post.id || post.shortCode
    const publishedAt = new Date(post.timestamp)

    // Date Filter: Skip if older than 14 days (HARDCODED)
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - DEFAULT_DAYS_LIMIT)

    if (publishedAt < cutoffDate) {
        return { status: "skipped", reason: `Старше ${DEFAULT_DAYS_LIMIT} дней` }
    }

    // SEPARATE FILTERING: Reels by views, Carousels/Images by likes
    if (post.type === "Video") {
        // Reels: filter by views
        if (minViews > 0 && views < minViews) {
            return { status: "skipped", reason: `${views.toLocaleString()} < ${minViews.toLocaleString()} просмотров` }
        }
    } else {
        // Sidecar (Carousel) or Image: filter by likes
        if (minLikes > 0 && likes < minLikes) {
            return { status: "skipped", reason: `${likes.toLocaleString()} < ${minLikes.toLocaleString()} лайков` }
        }
    }

    // Check if already exists IN THIS DATASET
    const existing = await prisma.contentItem.findFirst({
        where: {
            instagramId,
            datasetId
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

    // Calculate virality score (ratio to batch average)
    const viralityScore = averageViews > 0 ? views / averageViews : null

    // Create new content item with contentType
    const contentItem = await prisma.contentItem.create({
        data: {
            id: crypto.randomUUID(),
            instagramId,
            originalUrl: post.url,
            sourceUrl: `https://instagram.com/${post.ownerUsername}`,
            coverUrl: post.displayUrl,
            videoUrl: post.videoUrl,
            views,
            likes: post.likesCount,
            comments: post.commentsCount,
            publishedAt: new Date(post.timestamp),
            description: post.caption,
            viralityScore,
            contentType: post.type,  // NEW: save content type
            datasetId,
            isProcessed: false,
            isApproved: false
        }
    })

    console.log(`[Harvester] Created ${post.type}: ${contentItem.id}`)

    // Trigger AI processing for headline extraction
    await processContentItemAI(contentItem.id)

    return { status: "saved" }
}

// ==========================================
// Auto-Archiving
// ==========================================

/**
 * Archive content items older than 14 days
 * Returns count of archived items
 */
async function archiveOldContent(datasetId: string): Promise<number> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - DEFAULT_DAYS_LIMIT)

    const result = await prisma.contentItem.updateMany({
        where: {
            datasetId,
            isArchived: false,
            publishedAt: { lt: cutoffDate }
        },
        data: {
            isArchived: true,
            archivedAt: new Date()
        }
    })

    return result.count
}

// ==========================================
// AI Processing
// ==========================================

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

    // 2. Transcribe video audio (DISABLED per user request)
    /*
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
    */

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
