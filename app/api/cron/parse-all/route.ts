/**
 * Cron endpoint for automated parsing
 * 
 * This endpoint is designed to be called by:
 * - Vercel Cron Jobs (via vercel.json)
 * - External cron services
 * - System crontab
 * 
 * Recommended schedule: Every 6 hours (0 star/6 * * *)
 * 
 * Security: Requires CRON_SECRET header for authorization
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { processTrackingSource } from '@/lib/parser/harvester'

const CRON_SECRET = process.env.CRON_SECRET || 'default-cron-secret'

// Max sources to parse per cron run (to avoid timeout)
const MAX_SOURCES_PER_RUN = 10
// Delay between sources to avoid rate limiting
const DELAY_BETWEEN_SOURCES_MS = 30000 // 30 seconds

export const maxDuration = 300 // 5 minutes max
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    // Verify cron secret (skip in development)
    const authHeader = request.headers.get('authorization')
    const cronSecret = request.headers.get('x-cron-secret')

    if (process.env.NODE_ENV === 'production') {
        if (authHeader !== `Bearer ${CRON_SECRET}` && cronSecret !== CRON_SECRET) {
            console.log('[Cron] Unauthorized request')
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
    }

    console.log('[Cron] Starting automated parsing...')

    try {
        // Get all active tracking sources that need parsing
        // Prioritize sources that haven't been scraped recently
        const sources = await prisma.trackingSource.findMany({
            where: {
                isActive: true,
            },
            orderBy: [
                { lastScrapedAt: 'asc' }, // Oldest first
            ],
            take: MAX_SOURCES_PER_RUN,
            include: {
                dataset: {
                    select: {
                        id: true,
                        name: true,
                        userId: true,
                        user: {
                            select: {
                                email: true
                            }
                        }
                    }
                }
            }
        })

        console.log(`[Cron] Found ${sources.length} sources to parse`)

        if (sources.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'No sources to parse',
                processed: 0
            })
        }

        const results = {
            processed: 0,
            success: 0,
            failed: 0,
            details: [] as any[]
        }

        // Process sources sequentially with delays
        for (const source of sources) {
            console.log(`[Cron] Parsing source: ${source.username || source.url}`)

            try {
                const result = await processTrackingSource(source.id)

                results.details.push({
                    sourceId: source.id,
                    username: source.username,
                    datasetName: source.dataset.name,
                    status: 'success',
                    fetched: result.fetched,
                    saved: result.saved,
                    skipped: result.skipped
                })

                results.success++
                console.log(`[Cron] ✅ ${source.username}: ${result.saved} new posts`)

            } catch (error: any) {
                results.details.push({
                    sourceId: source.id,
                    username: source.username,
                    status: 'failed',
                    error: error.message
                })

                results.failed++
                console.error(`[Cron] ❌ ${source.username}: ${error.message}`)
            }

            results.processed++

            // Delay between sources to avoid Apify rate limiting
            if (results.processed < sources.length) {
                console.log(`[Cron] Waiting ${DELAY_BETWEEN_SOURCES_MS / 1000}s before next source...`)
                await new Promise(r => setTimeout(r, DELAY_BETWEEN_SOURCES_MS))
            }
        }

        console.log(`[Cron] Completed: ${results.success}/${results.processed} successful`)

        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            ...results
        })

    } catch (error: any) {
        console.error('[Cron] Fatal error:', error)
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 })
    }
}

// Also support POST for webhook-style triggers
export async function POST(request: NextRequest) {
    return GET(request)
}
