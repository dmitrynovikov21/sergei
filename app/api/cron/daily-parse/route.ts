/**
 * Daily Parsing Cron Endpoint
 * 
 * Triggers automated parsing for all active sources
 * Call this via cron job at 00:00 daily
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { parseAllUserSources } from "@/lib/parser/scheduler"

export async function GET(req: NextRequest) {
    try {
        // Verify cron secret (optional security)
        const authHeader = req.headers.get("authorization")
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Get all users with active sources
        const users = await prisma.user.findMany({
            where: {
                datasets: {
                    some: {
                        sources: {
                            some: {
                                isActive: true
                            }
                        }
                    }
                }
            },
            select: { id: true, email: true }
        })

        const results = []

        // Parse for each user
        for (const user of users) {
            const userResult = await parseAllUserSources(user.id)
            results.push({
                userId: user.id,
                email: user.email,
                ...userResult
            })
        }

        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            usersProcessed: users.length,
            results
        })
    } catch (error) {
        console.error("Cron parse error:", error)
        return NextResponse.json(
            { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown" },
            { status: 500 }
        )
    }
}
