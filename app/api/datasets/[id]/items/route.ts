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

        // Verify ownership
        const dataset = await prisma.dataset.findFirst({
            where: {
                id: params.id,
                userId: session.user.id
            }
        })

        if (!dataset) {
            return Response.json({ error: "Not found" }, { status: 404 })
        }

        // Get items
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
                views: true,
                likes: true,
                headline: true,
                transcript: true,
                isProcessed: true,
                isApproved: true,
                processingError: true,
                publishedAt: true
            }
        })

        return Response.json({ items })
    } catch (error) {
        console.error("Get items error:", error)
        return Response.json({ error: "Internal error" }, { status: 500 })
    }
}
