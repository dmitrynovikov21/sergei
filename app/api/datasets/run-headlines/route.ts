/**
 * Run Headline Extraction - Triggers headline extraction for posts without headlines
 * POST /api/datasets/run-headlines
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { processContentItemAI } from "@/lib/parser/harvester"

export async function POST(request: NextRequest) {
    try {
        const { datasetId } = await request.json()

        if (!datasetId) {
            return NextResponse.json({ error: "datasetId required" }, { status: 400 })
        }

        // Find posts without headlines that have cover images
        const items = await prisma.contentItem.findMany({
            where: {
                datasetId,
                headline: null,
                coverUrl: { not: null }
            },
            select: { id: true, coverUrl: true },
            orderBy: { views: 'desc' }
        })

        if (items.length === 0) {
            return NextResponse.json({ processed: 0, message: "Все заголовки уже извлечены" })
        }

        console.log(`[Run Headlines] Starting extraction for ${items.length} items`)

        // Process sequentially to avoid rate limits
        let processed = 0
        let errors = 0

        for (const item of items) {
            try {
                await processContentItemAI(item.id)
                processed++
                console.log(`[Run Headlines] ${processed}/${items.length} done`)
            } catch (error) {
                errors++
                console.error(`[Run Headlines] Error on ${item.id}:`, error)
            }
        }

        console.log(`[Run Headlines] Complete: ${processed} processed, ${errors} errors`)

        return NextResponse.json({
            processed,
            errors,
            total: items.length
        })

    } catch (error) {
        console.error('[Run Headlines] Error:', error)
        return NextResponse.json(
            { error: "Failed to run headline extraction" },
            { status: 500 }
        )
    }
}
