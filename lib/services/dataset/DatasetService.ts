/**
 * Dataset Service
 * 
 * Core database operations for Datasets, TrackingSources, and ContentItems.
 * Pure data access functions without auth checks.
 */

import { prisma } from "@/lib/db"
import { Dataset, TrackingSource, ContentItem } from "@prisma/client"

// ==========================================
// Types
// ==========================================

export type DatasetWithCounts = Dataset & {
    _count: {
        sources: number
        items: number
    }
}

export type DatasetWithDetails = Dataset & {
    sources: (TrackingSource & {
        parseHistory: any[]
    })[]
    items: ContentItem[]
}

export interface CreateDatasetInput {
    userId: string
    name: string
    description?: string
    isPublic?: boolean
}

export interface CreateTrackingSourceInput {
    datasetId: string
    url: string
    username: string
    minViewsFilter?: number
    daysLimit?: number
    contentTypes?: string
}

// ==========================================
// Dataset Operations
// ==========================================

export async function getDatasetsByUser(userId: string): Promise<DatasetWithCounts[]> {
    return prisma.dataset.findMany({
        where: { userId },
        include: {
            _count: {
                select: { sources: true, items: true }
            }
        },
        orderBy: { createdAt: "desc" }
    }) as Promise<DatasetWithCounts[]>
}

export async function getDatasetById(
    datasetId: string,
    userId?: string
): Promise<DatasetWithDetails | null> {
    return prisma.dataset.findFirst({
        where: {
            id: datasetId,
            ...(userId && { userId })
        },
        include: {
            sources: {
                orderBy: { createdAt: "desc" },
                include: {
                    parseHistory: {
                        orderBy: { started_at: 'desc' },
                        take: 1
                    }
                }
            },
            items: {
                orderBy: { views: "desc" },
                take: 100
            }
        }
    }) as Promise<DatasetWithDetails | null>
}

export async function createDataset(input: CreateDatasetInput): Promise<Dataset> {
    return prisma.dataset.create({
        data: {
            id: crypto.randomUUID(),
            name: input.name,
            description: input.description,
            userId: input.userId,
            isPublic: input.isPublic || false
        }
    })
}

export async function updateDataset(
    datasetId: string,
    data: { name?: string; description?: string }
): Promise<Dataset> {
    return prisma.dataset.update({
        where: { id: datasetId },
        data
    })
}

export async function deleteDataset(datasetId: string): Promise<void> {
    await prisma.dataset.delete({
        where: { id: datasetId }
    })
}

// ==========================================
// Public Dataset Access
// ==========================================

export async function getPublicDatasets() {
    return prisma.dataset.findMany({
        where: { isPublic: true },
        select: { id: true, name: true, description: true }
    })
}

// ==========================================
// Tracking Source Operations
// ==========================================

export async function createTrackingSource(input: CreateTrackingSourceInput): Promise<TrackingSource> {
    return prisma.trackingSource.create({
        data: {
            id: crypto.randomUUID(),
            url: input.url,
            username: input.username,
            datasetId: input.datasetId,
            minViewsFilter: input.minViewsFilter ?? 0,
            daysLimit: input.daysLimit ?? 30,
            contentTypes: input.contentTypes ?? "Video,Sidecar,Image"
        }
    })
}

export async function getTrackingSourceWithDataset(sourceId: string) {
    return prisma.trackingSource.findUnique({
        where: { id: sourceId },
        include: { dataset: true }
    })
}

export async function updateTrackingSource(
    sourceId: string,
    data: { isActive?: boolean; minViewsFilter?: number; fetchLimit?: number }
): Promise<TrackingSource> {
    return prisma.trackingSource.update({
        where: { id: sourceId },
        data
    })
}

export async function deleteTrackingSource(sourceId: string): Promise<void> {
    await prisma.trackingSource.delete({
        where: { id: sourceId }
    })
}

export async function checkTrackingSourceExists(
    datasetId: string,
    username: string
): Promise<boolean> {
    const existing = await prisma.trackingSource.findFirst({
        where: { datasetId, username }
    })
    return !!existing
}

// ==========================================
// Content Item Operations
// ==========================================

export async function getContentItems(
    datasetId: string,
    options?: { approved?: boolean; limit?: number }
): Promise<ContentItem[]> {
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
    itemId: string,
    data: { headline?: string; transcript?: string; isApproved?: boolean }
): Promise<ContentItem> {
    return prisma.contentItem.update({
        where: { id: itemId },
        data
    })
}

export async function deleteContentItem(itemId: string): Promise<void> {
    await prisma.contentItem.delete({
        where: { id: itemId }
    })
}

// ==========================================
// RAG Context Generation
// ==========================================

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

    if (items.length === 0) return ""

    const dataset = await prisma.dataset.findUnique({
        where: { id: datasetId }
    })

    let context = `\n---\n## ПРИМЕРЫ ЗАГОЛОВКОВ (${items.length} штук):\n\n`

    items.forEach((item, index) => {
        if (item.headline) {
            context += `${index + 1}. ${item.headline}\n`
        }
    })

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

export async function getAllDatasetsContext(userId: string): Promise<string> {
    const datasets = await prisma.dataset.findMany({
        where: { userId },
        include: {
            items: {
                where: { isProcessed: true, headline: { not: null } },
                orderBy: { views: "desc" },
                take: 25
            }
        }
    })

    if (datasets.length === 0) return ""

    const allItems = datasets.flatMap(d => d.items)
    if (allItems.length === 0) return ""

    const topItems = allItems
        .sort((a, b) => b.views - a.views)
        .slice(0, 50)

    let context = `\n---\n## ПРИМЕРЫ ЗАГОЛОВКОВ (${topItems.length} штук):\n\n`

    topItems.forEach((item, index) => {
        if (item.headline) {
            context += `${index + 1}. ${item.headline}\n`
        }
    })

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

// ==========================================
// Chat Integration
// ==========================================

export async function updateChatDataset(
    chatId: string,
    datasetId: string | null
): Promise<void> {
    await prisma.chat.update({
        where: { id: chatId },
        data: { datasetId }
    })
}

// ==========================================
// Access Control
// ==========================================

export async function canUserAccessDataset(
    datasetId: string,
    userId: string
): Promise<boolean> {
    const dataset = await prisma.dataset.findFirst({
        where: {
            id: datasetId,
            OR: [{ userId }, { isPublic: true }]
        }
    })
    return !!dataset
}
