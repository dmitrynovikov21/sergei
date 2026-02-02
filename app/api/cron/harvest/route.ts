/**
 * Cron Route for automated Instagram harvesting
 * 
 * GET /api/cron/harvest?secret=CRON_SECRET
 * 
 * Processes all active tracking sources
 */

import { NextRequest, NextResponse } from "next/server"
import { harvestAllSources } from "@/lib/parser/harvester"

export const runtime = "nodejs"
export const maxDuration = 300 // 5 minutes max

export async function GET(req: NextRequest) {
    // Verify cron secret
    const { searchParams } = new URL(req.url)
    const secret = searchParams.get("secret")

    if (secret !== process.env.CRON_SECRET) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 }
        )
    }

    try {
        console.log("[Cron] Starting harvest job...")

        const result = await harvestAllSources()

        console.log("[Cron] Harvest complete:", result)

        return NextResponse.json({
            success: true,
            ...result,
            timestamp: new Date().toISOString()
        })

    } catch (error) {
        console.error("[Cron] Harvest error:", error)

        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : "Unknown error",
                timestamp: new Date().toISOString()
            },
            { status: 500 }
        )
    }
}
