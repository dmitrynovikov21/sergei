/**
 * API endpoint to get dataset items
 * Used for polling/auto-refresh
 */

import { NextRequest } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return Response.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Verify ownership and get dataset name
        const dataset = await prisma.dataset.findFirst({
            where: {
                id: params.id,
                userId: session.user.id
            },
            select: { id: true, name: true }
        })

        if (!dataset) {
            return Response.json({ error: "Not found" }, { status: 404 })
        }

        // Get items with all fields for TrendsTable
        const items = await prisma.contentItem.findMany({
            where: { datasetId: params.id },
            orderBy: { views: "desc" },
            take: 1000,
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
        })

        // Get tracking sources for this dataset to resolve broken sourceUrls
        const trackingSources = await prisma.trackingSource.findMany({
            where: { datasetId: params.id },
            select: { username: true }
        })
        const knownUsernames = trackingSources.map(s => s.username).filter(Boolean) as string[]

        // Transform items to include sourceUsername and datasetName
        const transformedItems = items.map(item => {
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
                contentType: item.contentType === 'Video' ? 'Reel' :
                    item.contentType === 'Sidecar' ? 'Carousel' :
                        item.contentType === 'Image' ? 'Carousel' : 'Reel'
            }
        })

        return Response.json({ items: transformedItems })
    } catch (error) {
        console.error("Get items error:", error)
        return Response.json({ error: "Internal error" }, { status: 500 })
    }
}

