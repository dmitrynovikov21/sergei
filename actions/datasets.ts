/**
 * Dataset Server Actions
 * 
 * CRUD operations for Datasets, TrackingSources, and ContentItems
 */

"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { processTrackingSource, processContentItemAI } from "@/lib/parser/harvester"
import { extractUsername } from "@/lib/parser/apify-service"

// ==========================================
// Dataset CRUD
// ==========================================

export async function getDatasets() {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")

    return prisma.dataset.findMany({
        where: { userId: session.user.id },
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
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")

    return prisma.dataset.findFirst({
        where: {
            id,
            userId: session.user.id
        },
        include: {
            sources: {
                orderBy: { createdAt: "desc" }
            },
            items: {
                orderBy: { views: "desc" },
                take: 100
            }
        }
    })
}

export async function createDataset(name: string, description?: string) {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")

    const dataset = await prisma.dataset.create({
        data: {
            name,
            description,
            userId: session.user.id
        }
    })

    revalidatePath("/dashboard/datasets")
    return dataset
}

export async function updateDataset(id: string, data: { name?: string; description?: string }) {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")

    const dataset = await prisma.dataset.update({
        where: { id },
        data
    })

    revalidatePath("/dashboard/datasets")
    return dataset
}

export async function deleteDataset(id: string) {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")

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
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")

    // Verify dataset ownership
    const dataset = await prisma.dataset.findFirst({
        where: { id: datasetId, userId: session.user.id }
    })
    if (!dataset) throw new Error("Dataset not found")

    // Extract username from URL
    const username = extractUsername(url)
    if (!username) throw new Error("Invalid Instagram URL")

    const source = await prisma.trackingSource.create({
        data: {
            url,
            username,
            datasetId,
            minViewsFilter
        }
    })

    revalidatePath(`/dashboard/datasets/${datasetId}`)
    // Auto-start parsing
    processTrackingSource(source.id).catch(console.error)

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
        daysLimit?: number
        contentTypes?: string
    }
) {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")

    // Verify dataset ownership
    const dataset = await prisma.dataset.findFirst({
        where: { id: datasetId, userId: session.user.id }
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
                    url,
                    username,
                    datasetId,
                    minViewsFilter: options.minViewsFilter ?? 0,
                    daysLimit: options.daysLimit ?? 30,
                    contentTypes: options.contentTypes ?? "Video,Sidecar,Image"
                }
            })

            // Auto-start parsing in background (fire and forget pattern within action scope)
            // Note: In Vercel serverless, this might be cut off if not awaited, 
            // but for immediate feedback we don't want to block.
            // Using logic: if single source -> await. If bulk -> maybe await or accept risk?
            // User requested "automatically".
            // Let's await it to be safe for now, as scraping one source is usually fast (metadata).
            // Actually, processTrackingSource might take time.
            // Let's NOT await for bulk to avoid timeout.
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
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")

    const source = await prisma.trackingSource.update({
        where: { id },
        data
    })

    revalidatePath("/dashboard/datasets")
    return source
}

export async function deleteTrackingSource(id: string) {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")

    await prisma.trackingSource.delete({
        where: { id }
    })

    revalidatePath("/dashboard/datasets")
}

export async function forceScrapeSource(sourceId: string) {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")

    // Verify ownership
    const source = await prisma.trackingSource.findUnique({
        where: { id: sourceId },
        include: { dataset: true }
    })
    if (!source || source.dataset.userId !== session.user.id) {
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
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")

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
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")

    const item = await prisma.contentItem.update({
        where: { id },
        data
    })

    revalidatePath("/dashboard/datasets")
    return item
}

export async function reprocessContentItem(id: string) {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")

    await processContentItemAI(id)

    revalidatePath("/dashboard/datasets")
}

export async function deleteContentItem(id: string) {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")

    await prisma.contentItem.delete({
        where: { id }
    })

    revalidatePath("/dashboard/datasets")
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
    const session = await auth()
    if (!session?.user?.id) return []

    return prisma.dataset.findMany({
        where: { userId: session.user.id },
        select: {
            id: true,
            name: true,
            description: true
        }
    })
}

export async function updateChatDataset(chatId: string, datasetId: string | null) {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")

    await prisma.chat.update({
        where: { id: chatId },
        data: { datasetId }
    })

    revalidatePath(`/dashboard/chat/${chatId}`)
}

/**
 * Get RAG context from dataset for chat injection
 * Formats data like agent context files:
 * - Numbered list of headlines
 * - Optional scenarios section with transcripts
 */
export async function getDatasetContext(
    datasetId: string,
    limit: number = 50
): Promise<string> {
    const items = await prisma.contentItem.findMany({
        where: {
            datasetId,
            isProcessed: true,
            headline: { not: null }
        },
        orderBy: { views: "desc" },
        take: limit
    })

    if (items.length === 0) {
        return ""
    }

    const dataset = await prisma.dataset.findUnique({
        where: { id: datasetId }
    })

    let context = `\n---\n## ПРИМЕРЫ ЗАГОЛОВКОВ (${items.length} штук):\n\n`

    // Add headlines as numbered list
    items.forEach((item, index) => {
        if (item.headline) {
            context += `${index + 1}. ${item.headline}\n`
        }
    })

    // Add transcripts section if any exist
    const itemsWithTranscripts = items.filter(i => i.transcript && i.transcript.length > 50)
    if (itemsWithTranscripts.length > 0) {
        context += `\n---\n## СЦЕНАРИИ (${itemsWithTranscripts.length} штук):\n\n`

        itemsWithTranscripts.forEach((item, index) => {
            context += `### ${index + 1}. ${item.headline || "Без заголовка"}\n`
            context += `${item.transcript}\n\n`
        })
    }

    context += `---\n`
    context += `Источник данных: ${dataset?.name || "Instagram RAG"}\n`

    return context
}

/**
 * Get aggregated context from ALL user's datasets
 * Used for auto-injection into all agent prompts
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
                take: 25 // Take top 25 from each dataset
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
