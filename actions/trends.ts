
"use server"

import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth-helpers"

export async function getTrendsData() {
    await requireAuth() // Still require login, but show ALL content

    // Get ALL content items from ALL datasets (shared across users)
    const items = await prisma.contentItem.findMany({
        select: {
            id: true,
            views: true,
            likes: true,
            publishedAt: true
        },
        orderBy: {
            publishedAt: 'asc'
        }
    })

    // 2. Aggregate by date
    // Sort items by date just in case
    // We want a cumulative growth or daily stats? 
    // Usually daily stats for "Content Performance" area chart.

    const dateMap = new Map<string, { date: string, views: number, likes: number, count: number }>()

    items.forEach(item => {
        if (!item.publishedAt) return

        // Format YYYY-MM-DD
        const dateKey = item.publishedAt.toISOString().split('T')[0]

        const current = dateMap.get(dateKey) || { date: dateKey, views: 0, likes: 0, count: 0 }

        current.views += item.views
        current.likes += item.likes
        current.count += 1

        dateMap.set(dateKey, current)
    })

    // Convert to array and sort
    const dailyStats = Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date))

    // 3. Calculate Totals
    const totalViews = items.reduce((sum, item) => sum + item.views, 0)
    const totalLikes = items.reduce((sum, item) => sum + item.likes, 0)
    const totalPosts = items.length

    // Avg Views
    const avgViews = totalPosts > 0 ? Math.round(totalViews / totalPosts) : 0

    // High Virality (e.g. posts with > 2x average views)
    const highViralityCount = items.filter(i => i.views > (avgViews * 2)).length

    return {
        dailyStats,
        totals: {
            posts: totalPosts,
            views: totalViews,
            likes: totalLikes,
            avgViews,
            highViralityCount
        }
    }
}

export async function getAllContentItems() {
    await requireAuth() // Still require login, but show ALL content

    // Get ALL content items (shared across users)
    const items = await prisma.contentItem.findMany({
        select: {
            id: true,
            instagramId: true,
            headline: true,
            description: true,
            originalUrl: true,
            coverUrl: true,
            videoUrl: true,
            views: true,
            likes: true,
            comments: true,
            viralityScore: true,
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
            aiAnalyzedAt: true,
            contentType: true, // Added field
            dataset: {
                select: {
                    id: true,
                    name: true,
                    sources: {
                        select: {
                            username: true
                        },
                        take: 1
                    }
                }
            }
        },
        orderBy: {
            viralityScore: 'desc'
        }
    })

    // Map to flat structure
    const mapped = items.map(item => {
        // Determine display type from DB contentType field
        // Known DB values: 'Video', 'Reel', 'Sidecar', 'Carousel', 'Post', 'Image', null
        let type: 'Reel' | 'Carousel'
        switch (item.contentType) {
            case 'Video':
            case 'Reel':
                type = 'Reel'
                break
            case 'Sidecar':
            case 'Carousel':
            case 'Image':
                type = 'Carousel'
                break
            case 'Post':
                // Instagram 'Post' can be video or image — check videoUrl
                type = item.videoUrl ? 'Reel' : 'Carousel'
                break
            default:
                // null/unknown — fallback to videoUrl heuristic
                type = item.videoUrl ? 'Reel' : 'Carousel'
        }

        return {
            ...item,
            sourceUsername: item.dataset.sources[0]?.username || 'unknown',
            datasetName: item.dataset.name,
            contentType: type
        }
    })

    // Deduplicate by instagramId AND by headline+metrics combo (cross-dataset duplicates)
    const dedupedById = new Map<string, typeof mapped[0]>()
    const dedupedByContent = new Map<string, typeof mapped[0]>()

    for (const item of mapped) {
        // First pass: dedupe by instagramId
        const idKey = item.instagramId || item.id
        const existingById = dedupedById.get(idKey)
        if (!existingById || (item.viralityScore || 0) > (existingById.viralityScore || 0)) {
            dedupedById.set(idKey, item)
        }
    }

    // Second pass: dedupe by content signature (headline + views + likes)
    for (const item of dedupedById.values()) {
        const contentKey = `${(item.headline || '').trim().toLowerCase()}|${item.views}|${item.likes}`
        const existing = dedupedByContent.get(contentKey)
        if (!existing) {
            dedupedByContent.set(contentKey, item)
        } else {
            // Prefer entry with AI analysis
            const hasAi = !!item.aiTopic
            const existingHasAi = !!existing.aiTopic
            if (hasAi && !existingHasAi) {
                dedupedByContent.set(contentKey, item)
            } else if ((item.viralityScore || 0) > (existing.viralityScore || 0)) {
                dedupedByContent.set(contentKey, item)
            }
        }
    }

    return Array.from(dedupedByContent.values())
}
