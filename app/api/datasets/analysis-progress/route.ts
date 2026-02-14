/**
 * AI Analysis Progress API - Returns real counts from database
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const datasetId = searchParams.get('datasetId')

        if (!datasetId) {
            return NextResponse.json({ error: "datasetId required" }, { status: 400 })
        }

        const MIN_VIEWS_FOR_AI = 50000

        // Real counts from database
        const [total, analyzed, eligible] = await Promise.all([
            prisma.contentItem.count({ where: { datasetId } }),
            prisma.contentItem.count({ where: { datasetId, aiAnalyzedAt: { not: null } } }),
            prisma.contentItem.count({ where: { datasetId, views: { gte: MIN_VIEWS_FOR_AI } } }),
        ])

        const pending = Math.max(0, eligible - analyzed)

        // Check if analysis is actively running (any item analyzed in last 2 min)
        const recentlyAnalyzed = await prisma.contentItem.count({
            where: {
                datasetId,
                aiAnalyzedAt: { gte: new Date(Date.now() - 2 * 60 * 1000) }
            }
        })
        const isRunning = recentlyAnalyzed > 0 && pending > 0

        return NextResponse.json({
            total,
            analyzed,
            eligible,
            pending,
            isRunning,
        })

    } catch (error) {
        console.error('[Analysis Progress] Error:', error)
        return NextResponse.json({ error: "Failed to get progress" }, { status: 500 })
    }
}
