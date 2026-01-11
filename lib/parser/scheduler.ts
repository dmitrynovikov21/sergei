/**
 * Scheduled Parse Functions
 * 
 * Handles automated daily parsing with statistics tracking
 */

import { prisma } from "@/lib/db"
import { processTrackingSource } from "@/lib/parser/harvester"

/**
 * Parse a single source with date filtering and stats tracking
 */
export async function scheduledParse(sourceId: string, daysRange: 7 | 14) {
    // Create parse history record
    const parseHistory = await prisma.parseHistory.create({
        data: {
            sourceId,
            daysRange,
            status: "running"
        }
    })

    try {
        // Calculate date filter
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - daysRange)

        // Get source details
        const source = await prisma.trackingSource.findUnique({
            where: { id: sourceId }
        })

        if (!source) {
            throw new Error("Source not found")
        }

        // Track initial count
        const initialCount = await prisma.contentItem.count({
            where: { datasetId: source.datasetId }
        })

        // Run the actual parse
        // Note: We'll need to modify processTrackingSource to accept date filter
        await processTrackingSource(sourceId)

        // Count new items
        const finalCount = await prisma.contentItem.count({
            where: { datasetId: source.datasetId }
        })

        const postsAdded = finalCount - initialCount

        // Update parse history with success
        await prisma.parseHistory.update({
            where: { id: parseHistory.id },
            data: {
                status: "completed",
                completedAt: new Date(),
                postsFound: postsAdded, // Simplified for now
                postsAdded,
                postsSkipped: 0
            }
        })

        return {
            success: true,
            postsAdded,
            parseHistoryId: parseHistory.id
        }
    } catch (error) {
        // Update parse history with error
        await prisma.parseHistory.update({
            where: { id: parseHistory.id },
            data: {
                status: "failed",
                completedAt: new Date(),
                error: error instanceof Error ? error.message : "Unknown error"
            }
        })

        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
            parseHistoryId: parseHistory.id
        }
    }
}

/**
 * Parse all active sources for a user
 */
export async function parseAllUserSources(userId: string) {
    const sources = await prisma.trackingSource.findMany({
        where: {
            dataset: { userId },
            isActive: true
        },
        include: {
            dataset: true
        }
    })

    const results = {
        total: sources.length,
        completed: 0,
        failed: 0,
        details: [] as any[]
    }

    // Parse each source for both 7 and 14 days
    for (const source of sources) {
        // Parse 7 days
        const result7 = await scheduledParse(source.id, 7)
        results.details.push({ sourceId: source.id, days: 7, ...result7 })
        if (result7.success) results.completed++
        else results.failed++

        // Parse 14 days  
        const result14 = await scheduledParse(source.id, 14)
        results.details.push({ sourceId: source.id, days: 14, ...result14 })
        if (result14.success) results.completed++
        else results.failed++
    }

    return results
}
