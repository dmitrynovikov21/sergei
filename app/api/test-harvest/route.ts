/**
 * Test Harvest Route
 * 
 * Creates a "Test Run" dataset, adds user-provided source, 
 * and triggers a harvest immediately.
 * 
 * /api/test-harvest
 */

import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { processTrackingSource } from "@/lib/parser/harvester"

export const runtime = "nodejs"
export const maxDuration = 300 // 5 minutes

const TEST_SOURCES = [
    "https://www.instagram.com/kostenkovru/"
]

export async function GET() {
    try {
        console.log("[Test] Starting test run for kostenkovru (30 days)...")

        // 1. Get First User (Owner)
        const user = await prisma.user.findFirst()
        if (!user) {
            return NextResponse.json({ error: "No users found in DB" }, { status: 500 })
        }

        // 2. Create or Get Test Dataset
        let dataset = await prisma.dataset.findFirst({
            where: { name: "Test Run", userId: user.id }
        })

        if (!dataset) {
            dataset = await prisma.dataset.create({
                data: {
                    name: "Test Run",
                    description: "Automated test harvest",
                    userId: user.id
                }
            })
        }

        // 3. Add Sources
        const results: any[] = []
        for (const url of TEST_SOURCES) {
            const usernameMatch = url.match(/instagram\.com\/([^/?]+)/)
            const username = usernameMatch ? usernameMatch[1] : null

            if (!username) continue

            // Check if exists
            let source = await prisma.trackingSource.findFirst({
                where: { datasetId: dataset.id, username }
            })

            if (!source) {
                source = await prisma.trackingSource.create({
                    data: {
                        url,
                        username,
                        datasetId: dataset.id,
                        minViewsFilter: 0, // Catch everything for test
                        fetchLimit: 20 // Reduced for debugging speed
                    }
                })
                console.log(`[Test] Added source @${username}`)
            } else {
                // Update fetch limit to ensure we get enough history
                await prisma.trackingSource.update({
                    where: { id: source.id },
                    data: { fetchLimit: 50 }
                })
            }

            // 4. Force Scrape
            console.log(`[Test] Scraping @${username}...`)
            try {
                const harvestResult = await processTrackingSource(source.id)
                results.push({ username, ...harvestResult })
            } catch (err) {
                const errorMsg = err instanceof Error ? err.message : "Unknown error"
                results.push({ username, error: errorMsg })
            }
        }

        return NextResponse.json({
            success: true,
            datasetId: dataset.id,
            results
        })

    } catch (error) {
        console.error("[Test Error]", error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 }
        )
    }
}
