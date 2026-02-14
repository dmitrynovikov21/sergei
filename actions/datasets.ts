/**
 * Dataset Server Actions
 * 
 * CRUD operations for Datasets, TrackingSources, and ContentItems
 * 
 * REFACTORED: Uses requireAuth() helper for DRY auth checks
 */

"use server"

import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { requireAuth, getCurrentUser } from "@/lib/auth-helpers"
import { processTrackingSource, processContentItemAI } from "@/lib/parser/harvester"
import { extractUsername } from "@/lib/parser/parser-client"

// ==========================================
// Dataset CRUD
// ==========================================

export async function getDatasets() {
    await requireAuth() // Still require login, but show ALL datasets

    // Return ALL datasets (shared across users)
    return prisma.dataset.findMany({
        include: {
            _count: {
                select: {
                    sources: true,
                    items: true
                }
            }
        },
        orderBy: { createdAt: "desc" }
    })
}

export async function getDataset(id: string) {
    await requireAuth() // Still require login

    // Return dataset by ID (shared - no userId filter)
    const dataset = await prisma.dataset.findFirst({
        where: { id },
        include: {
            sources: {
                orderBy: { createdAt: "desc" },
                include: {
                    parseHistory: {
                        orderBy: { started_at: 'desc' },
                        take: 3,
                        select: {
                            id: true,
                            started_at: true,
                            completed_at: true,
                            status: true,
                            daysRange: true,
                            posts_found: true,
                            posts_added: true,
                            posts_skipped: true,
                            posts_filtered: true,
                            posts_archived: true,
                            posts_updated: true,
                            apify_raw_count: true,
                            error: true
                        }
                    }
                }
            },
            items: {
                orderBy: { views: "desc" },
                take: 100,
                select: {
                    id: true,
                    instagramId: true,
                    originalUrl: true,
                    sourceUrl: true,
                    coverUrl: true,
                    videoUrl: true,
                    views: true,
                    likes: true,
                    comments: true,
                    viralityScore: true,
                    headline: true,
                    transcript: true,
                    description: true,
                    contentType: true,
                    isProcessed: true,
                    isApproved: true,
                    processingError: true,
                    publishedAt: true,
                    // AI Analysis fields
                    aiTopic: true,
                    aiSubtopic: true,
                    aiHookType: true,
                    aiContentFormula: true,
                    aiTags: true,
                    aiSuccessReason: true,
                    aiEmotionalTrigger: true,
                    aiTargetAudience: true,
                    aiAnalyzedAt: true
                }
            }
        }
    })

    if (!dataset) return null

    // Transform items to TrendsTable format
    const transformedItems = dataset.items.map(item => {
        let sourceUsername = 'unknown'
        if (item.sourceUrl) {
            const match = item.sourceUrl.match(/instagram\.com\/([^\/]+)/)
            if (match && match[1] !== 'p' && match[1] !== 'reel') {
                sourceUsername = match[1]
            }
        }

        return {
            ...item,
            sourceUsername,
            datasetName: dataset.name,
            contentType: (item.contentType === 'Video' ? 'Reel' :
                item.contentType === 'Sidecar' ? 'Carousel' :
                    item.contentType === 'Image' ? 'Carousel' : 'Reel') as 'Reel' | 'Carousel'
        }
    })

    // Transform sources to include serializable parseHistory
    const transformedSources = dataset.sources.map(source => ({
        ...source,
        parseHistory: source.parseHistory.map(h => ({
            id: h.id,
            startedAt: h.started_at,
            completedAt: h.completed_at,
            status: h.status,
            daysRange: h.daysRange,
            postsFound: h.posts_found,
            postsAdded: h.posts_added,
            postsSkipped: h.posts_skipped,
            postsFiltered: h.posts_filtered,
            postsArchived: h.posts_archived,
            postsUpdated: h.posts_updated,
            apifyRawCount: h.apify_raw_count,
            error: h.error
        }))
    }))

    return {
        ...dataset,
        sources: transformedSources,
        items: transformedItems
    }
}


export async function createDataset(name: string, description?: string) {
    const user = await requireAuth()

    const dataset = await prisma.dataset.create({
        data: {
            id: crypto.randomUUID(),
            name,
            description,
            userId: user.id
        }
    })

    revalidatePath("/dashboard/datasets")
    return dataset
}

export async function updateDataset(id: string, data: { name?: string; description?: string }) {
    await requireAuth()

    const dataset = await prisma.dataset.update({
        where: { id },
        data
    })

    revalidatePath("/dashboard/datasets")
    return dataset
}

export async function deleteDataset(id: string) {
    await requireAuth()

    await prisma.dataset.delete({
        where: { id }
    })

    revalidatePath("/dashboard/datasets")
}

// ==========================================
// Tracking Source Management
// ==========================================

export async function addTrackingSource(
    datasetId: string,
    url: string,
    minViewsFilter: number = 10000
) {
    const user = await requireAuth()

    // Verify dataset ownership
    const dataset = await prisma.dataset.findFirst({
        where: { id: datasetId, userId: user.id }
    })
    if (!dataset) throw new Error("Dataset not found")

    // Extract username from URL
    const username = extractUsername(url)
    if (!username) throw new Error("Invalid Instagram URL")

    // Check if already exists in this dataset
    const existing = await prisma.trackingSource.findFirst({
        where: { datasetId, username }
    })
    if (existing) {
        // Reactivate if it was inactive?
        if (!existing.isActive) {
            await prisma.trackingSource.update({
                where: { id: existing.id },
                data: { isActive: true }
            })
        }
        return existing
    }

    const source = await prisma.trackingSource.create({
        data: {
            id: crypto.randomUUID(),
            url,
            username,
            datasetId,
            minViewsFilter
        }
    })

    revalidatePath(`/dashboard/datasets/${datasetId}`)
    // Auto-start parsing
    await processTrackingSource(source.id)

    return source
}

/**
 * Add multiple tracking sources at once with filtering options
 */
export async function addBulkTrackingSources(
    datasetId: string,
    urls: string[],
    options: {
        minViewsFilter?: number
        minLikesFilter?: number
        daysLimit?: number
        contentTypes?: string
    }
) {
    const user = await requireAuth()

    // Verify dataset ownership
    const dataset = await prisma.dataset.findFirst({
        where: { id: datasetId, userId: user.id }
    })
    if (!dataset) throw new Error("Dataset not found")

    const results = { added: 0, skipped: 0, errors: [] as string[] }

    for (const url of urls) {
        try {
            const username = extractUsername(url)
            if (!username) {
                results.skipped++
                continue
            }

            // Check if already exists
            const existing = await prisma.trackingSource.findFirst({
                where: { datasetId, username }
            })
            if (existing) {
                results.skipped++
                continue
            }

            const source = await prisma.trackingSource.create({
                data: {
                    id: crypto.randomUUID(),
                    url,
                    username,
                    datasetId,
                    minViewsFilter: options.minViewsFilter ?? 0,
                    minLikesFilter: options.minLikesFilter ?? 0,
                    daysLimit: options.daysLimit ?? 30,
                    contentTypes: options.contentTypes ?? "Video,Sidecar,Image"
                }
            })

            // Auto-start parsing in background (fire and forget)
            processTrackingSource(source.id).catch(console.error)

            results.added++
        } catch (error) {
            results.errors.push(url)
        }
    }

    revalidatePath(`/dashboard/datasets/${datasetId}`)
    return results
}

export async function updateTrackingSource(
    id: string,
    data: {
        isActive?: boolean
        minViewsFilter?: number
        fetchLimit?: number
    }
) {
    await requireAuth()

    const source = await prisma.trackingSource.update({
        where: { id },
        data
    })

    revalidatePath("/dashboard/datasets")
    return source
}

export async function deleteTrackingSource(id: string) {
    await requireAuth()

    await prisma.trackingSource.delete({
        where: { id }
    })

    revalidatePath("/dashboard/datasets")
}

export async function forceScrapeSource(sourceId: string) {
    const user = await requireAuth()

    // Verify ownership
    const source = await prisma.trackingSource.findUnique({
        where: { id: sourceId },
        include: { dataset: true }
    })
    if (!source || source.dataset.userId !== user.id) {
        throw new Error("Source not found")
    }

    const result = await processTrackingSource(sourceId)

    revalidatePath(`/dashboard/datasets/${source.datasetId}`)
    return result
}

// ==========================================
// Content Item Management
// ==========================================

export async function getContentItems(datasetId: string, options?: {
    approved?: boolean
    limit?: number
}) {
    await requireAuth()

    return prisma.contentItem.findMany({
        where: {
            datasetId,
            ...(options?.approved !== undefined && { isApproved: options.approved })
        },
        orderBy: { views: "desc" },
        take: options?.limit || 100
    })
}

export async function updateContentItem(
    id: string,
    data: {
        headline?: string
        transcript?: string
        isApproved?: boolean
    }
) {
    await requireAuth()

    const item = await prisma.contentItem.update({
        where: { id },
        data
    })

    revalidatePath("/dashboard/datasets")
    return item
}

export async function reprocessContentItem(id: string) {
    await requireAuth()

    await processContentItemAI(id)

    revalidatePath("/dashboard/datasets")
}

export async function deleteContentItem(id: string) {
    await requireAuth()

    await prisma.contentItem.delete({
        where: { id }
    })

    revalidatePath("/dashboard/datasets")
}

/**
 * Reprocess all content items in a dataset that have missing headlines
 */
export async function reprocessDatasetHeadlines(datasetId: string): Promise<{
    processed: number
    errors: string[]
}> {
    await requireAuth()

    // Find all items with missing headlines or processing errors
    const items = await prisma.contentItem.findMany({
        where: {
            datasetId,
            OR: [
                { headline: null },
                { processingError: { not: null } }
            ]
        }
    })

    const errors: string[] = []
    let processed = 0

    for (const item of items) {
        try {
            await processContentItemAI(item.id)
            processed++
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : "Unknown error"
            errors.push(`Item ${item.id}: ${errorMsg}`)
            console.error(`[Reprocess] Error processing item ${item.id}:`, errorMsg)
        }
    }

    revalidatePath(`/dashboard/datasets/${datasetId}`)
    revalidatePath("/dashboard/datasets")

    return { processed, errors }
}

// ==========================================
// Chat Dataset Integration
// ==========================================

export async function getPublicDatasets() {
    return prisma.dataset.findMany({
        where: { isPublic: true },
        select: {
            id: true,
            name: true,
            description: true
        }
    })
}

export async function getUserDatasets() {
    await requireAuth() // Still require login

    // Return ALL datasets (shared across users)
    return prisma.dataset.findMany({
        select: {
            id: true,
            name: true,
            description: true
        }
    })
}

export async function updateChatDataset(chatId: string, datasetId: string | null) {
    await requireAuth()

    await prisma.chat.update({
        where: { id: chatId },
        data: { datasetId }
    })

    revalidatePath(`/dashboard/chat/${chatId}`)
}

/**
 * Format number to human readable (1200000 -> "1.2M")
 */
function formatViews(num: number): string {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M'
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K'
    }
    return num.toString()
}

/**
 * Get RAG context from dataset for chat injection.
 * Loads ALL items from the dataset — no limits, no date filters, no truncation.
 */
export async function getDatasetContext(datasetId: string): Promise<string> {
    const items = await prisma.contentItem.findMany({
        where: { datasetId },
        orderBy: [
            { viralityScore: "desc" },
            { views: "desc" }
        ],
        select: {
            headline: true,
            views: true,
            likes: true,
            viralityScore: true,
            contentType: true,
        }
    })

    if (items.length === 0) return ""

    const dataset = await prisma.dataset.findUnique({
        where: { id: datasetId }
    })

    let context = `\n---\n## 🔥 ДАТАСЕТ: ${dataset?.name || "Instagram"} (${items.length} единиц)\n\n`
    context += `| # | Заголовок | Просмотры | Лайки | Score |\n`
    context += `|---|-----------|-----------|-------|-------|\n`

    items.forEach((item, index) => {
        const headline = item.headline || "—"
        const views = formatViews(item.views)
        const likes = formatViews(item.likes)
        const score = item.viralityScore?.toFixed(1) || "—"
        context += `| ${index + 1} | ${headline} | ${views} | ${likes} | ${score} |\n`
    })

    context += `---\n`
    context += `Источник: ${dataset?.name || "Instagram RAG"} | Всего: ${items.length} единиц\n`

    return context
}

/**
 * Get aggregated context from ALL user's datasets
 */
export async function getAllDatasetsContext(userId: string): Promise<string> {
    const datasets = await prisma.dataset.findMany({
        where: { userId },
        include: {
            items: {
                where: {
                    isProcessed: true,
                    headline: { not: null }
                },
                orderBy: { views: "desc" },
                take: 25
            }
        }
    })

    if (datasets.length === 0) {
        return ""
    }

    // Aggregate all items
    const allItems = datasets.flatMap(d => d.items)
    if (allItems.length === 0) {
        return ""
    }

    // Sort by views and take top 50 total
    const topItems = allItems
        .sort((a, b) => b.views - a.views)
        .slice(0, 50)

    let context = `\n---\n## ПРИМЕРЫ ЗАГОЛОВКОВ (${topItems.length} штук):\n\n`

    // Add headlines as numbered list
    topItems.forEach((item, index) => {
        if (item.headline) {
            context += `${index + 1}. ${item.headline}\n`
        }
    })

    // Add transcripts section
    const itemsWithTranscripts = topItems.filter(i => i.transcript && i.transcript.length > 50)
    if (itemsWithTranscripts.length > 0) {
        context += `\n---\n## СЦЕНАРИИ (${itemsWithTranscripts.length} штук):\n\n`

        itemsWithTranscripts.forEach((item, index) => {
            context += `### ${index + 1}. ${item.headline || "Без заголовка"}\n`
            context += `${item.transcript}\n\n`
        })
    }

    context += `---\n`
    context += `Источник: Instagram RAG (${datasets.length} датасетов)\n`

    return context
}
