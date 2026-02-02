/**
 * Monthly Credit Reset Cron
 * 
 * Resets subscription credits to their max limit on the 1st of each month.
 * Should be called by external cron service (Vercel Cron, etc.)
 * 
 * POST /api/cron/monthly-reset
 * Header: x-cron-secret: <CRON_SECRET>
 */

import { NextRequest, NextResponse } from "next/server"
import { resetMonthlyCredits } from "@/actions/subscriptions"

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
    try {
        // Verify cron secret
        const cronSecret = req.headers.get('x-cron-secret')
        const expectedSecret = process.env.CRON_SECRET

        if (!expectedSecret || cronSecret !== expectedSecret) {
            console.log('[Cron Monthly Reset] Invalid or missing cron secret')
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        console.log('[Cron Monthly Reset] Starting monthly credit reset...')

        const result = await resetMonthlyCredits()

        console.log(`[Cron Monthly Reset] Completed. Reset ${result.resetCount} subscriptions.`)

        return NextResponse.json({
            success: true,
            resetCount: result.resetCount,
            timestamp: new Date().toISOString()
        })

    } catch (error) {
        console.error('[Cron Monthly Reset] Error:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal error' },
            { status: 500 }
        )
    }
}

// Also support GET for easier testing
export async function GET(req: NextRequest) {
    return POST(req)
}
