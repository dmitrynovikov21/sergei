/**
 * Trigger AI Analysis for unanalyzed items in a dataset
 * POST /api/datasets/run-analysis
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { analyzeAndSaveContentItems } from "@/lib/parser/ai-analyzer"

export async function POST(request: NextRequest) {
    try {
        const { datasetId } = await request.json()

        if (!datasetId) {
            return NextResponse.json({ error: "datasetId required" }, { status: 400 })
        }

        // Find all unanalyzed items with 50K+ views
        const unanalyzed = await prisma.contentItem.findMany({
            where: {
                datasetId,
                aiAnalyzedAt: null,
                views: { gte: 50000 }
            },
            select: { id: true }
        })

        if (unanalyzed.length === 0) {
            return NextResponse.json({ analyzed: 0, message: "Все посты уже проанализированы" })
        }

        const itemIds = unanalyzed.map(i => i.id)

        // Run analysis (this is async and may take time)
        const analyzed = await analyzeAndSaveContentItems(itemIds)

        return NextResponse.json({ analyzed, total: itemIds.length })

    } catch (error) {
        console.error('[Run Analysis] Error:', error)
        return NextResponse.json(
            { error: "Failed to run analysis" },
            { status: 500 }
        )
    }
}
