import { prisma } from "@/lib/db"
import { addJobToQueue } from "@/lib/queue"

/**
 * Trigger parsing for all user sources by adding them to the queue
 */
export async function parseAllUserSources(userId: string) {
    const sources = await prisma.trackingSource.findMany({
        where: {
            dataset: { userId },
            isActive: true
        }
    })

    const results = {
        total: sources.length,
        queued: 0,
        details: [] as any[]
    }

    // Enqueue job for each source (let worker handle the logic)
    for (const source of sources) {
        // Queue extraction job
        await addJobToQueue({
            type: 'PARSE_SOURCE',
            userId,
            payload: {
                sourceId: source.id
            }
        })

        results.queued++
        results.details.push({ sourceId: source.id, status: 'queued' })
    }

    return results
}

/**
 * Legacy synchronous parse function (kept if needed for manual distinct triggering, but queue is preferred)
 * You can keep it or deprecate it. The worker now calls processTrackingSource directly.
 */
export async function scheduledParse(sourceId: string, daysRange: 7 | 14) {
    // This is now effectively replaced by the worker logic calling processTrackingSource
    // Leaving it as a stub or direct call wrapper if needed
    const { processTrackingSource } = await import("@/lib/parser/harvester")
    return processTrackingSource(sourceId)
}
