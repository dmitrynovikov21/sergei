/**
 * Parse Queue - Scalable source processing with concurrency control
 * 
 * Handles 20+ sources without overwhelming APIs:
 * - Max 3 sources processed simultaneously
 * - Rate limited to 5 per minute
 */

import PQueue from 'p-queue'
import { prisma } from "@/lib/db"
import { processTrackingSource } from "./harvester"

// ==========================================
// Queue Configuration
// ==========================================

// Max 3 sources processed at the same time
const CONCURRENCY = 3
// Max 5 sources started per minute (rate limiting)
const INTERVAL_CAP = 5
const INTERVAL_MS = 60 * 1000  // 1 minute

// Global parse queue
const parseQueue = new PQueue({
    concurrency: CONCURRENCY,
    interval: INTERVAL_MS,
    intervalCap: INTERVAL_CAP
})

// ==========================================
// Queue Functions
// ==========================================

/**
 * Add a single source to the parse queue
 * Returns a promise that resolves when parsing completes
 */
export async function queueSourceParsing(sourceId: string) {
    console.log(`[Queue] Adding source ${sourceId} to queue (pending: ${parseQueue.pending}, size: ${parseQueue.size})`)

    return parseQueue.add(async () => {
        console.log(`[Queue] Starting parse for source ${sourceId}`)
        const result = await processTrackingSource(sourceId)
        console.log(`[Queue] Completed source ${sourceId}: ${result.saved} saved, ${result.updated} updated`)
        return result
    })
}

/**
 * Parse all active sources using the queue
 * Sources are processed with concurrency control
 */
export async function parseAllSourcesQueued(): Promise<{
    totalProcessed: number
    totalUpdated: number
    totalSkipped: number
    errors: string[]
}> {
    const sources = await prisma.trackingSource.findMany({
        where: { isActive: true }
    })

    console.log(`[Queue] Queueing ${sources.length} sources (concurrency: ${CONCURRENCY})`)

    const result = {
        totalProcessed: 0,
        totalUpdated: 0,
        totalSkipped: 0,
        errors: [] as string[]
    }

    // Add all sources to queue
    const promises = sources.map(source =>
        queueSourceParsing(source.id)
            .then(r => {
                if (r) {
                    result.totalProcessed += r.saved
                    result.totalUpdated += r.updated
                    result.totalSkipped += r.skipped
                    result.errors.push(...r.errors)
                }
            })
            .catch(error => {
                const errorMsg = error instanceof Error ? error.message : "Unknown"
                result.errors.push(`Source ${source.id}: ${errorMsg}`)
            })
    )

    // Wait for all to complete
    await Promise.all(promises)

    console.log(`[Queue] All ${sources.length} sources processed`)
    return result
}

/**
 * Parse sources that are due based on their parseFrequency
 * Called by scheduler
 */
export async function parseDueSources(): Promise<number> {
    const sources = await prisma.trackingSource.findMany({
        where: { isActive: true }
    })

    let queued = 0

    for (const source of sources) {
        if (shouldParseSource(source)) {
            await queueSourceParsing(source.id)
            queued++
        }
    }

    console.log(`[Queue] Queued ${queued}/${sources.length} due sources`)
    return queued
}

/**
 * Check if a source should be parsed based on lastScrapedAt and parseFrequency
 */
function shouldParseSource(source: {
    lastScrapedAt: Date | null
    parseFrequency: string
}): boolean {
    if (!source.lastScrapedAt) return true

    const hoursSinceLast = (Date.now() - source.lastScrapedAt.getTime()) / (1000 * 60 * 60)

    switch (source.parseFrequency) {
        case 'daily':
            return hoursSinceLast >= 24
        case '3days':
            return hoursSinceLast >= 72
        case 'weekly':
        default:
            return hoursSinceLast >= 168  // 7 days
    }
}

/**
 * Get queue status for monitoring
 */
export function getQueueStatus() {
    return {
        pending: parseQueue.pending,
        size: parseQueue.size,
        isPaused: parseQueue.isPaused
    }
}
