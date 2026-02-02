
import { NextRequest } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return Response.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Get running parses for this dataset
        // Join with TrackingSource to get username
        const runningParses = await prisma.parseHistory.findMany({
            where: {
                status: "running",
                source: {
                    datasetId: params.id
                }
            },
            include: {
                source: {
                    select: {
                        username: true,
                        daysLimit: true,
                        minViewsFilter: true
                    }
                }
            },
            orderBy: {
                started_at: "desc"
            }
        })

        if (runningParses.length === 0) {
            const lastFailed = await prisma.parseHistory.findFirst({
                where: {
                    status: "failed",
                    source: { datasetId: params.id },
                    started_at: { gt: new Date(Date.now() - 5 * 60 * 1000) }
                },
                include: { source: { select: { username: true } } },
                orderBy: { started_at: "desc" }
            })

            if (lastFailed) {
                return Response.json({
                    isRunning: false,
                    error: lastFailed.error,
                    username: lastFailed.source.username,
                    isError: true
                })
            }
            return Response.json({ isRunning: false })
        }

        // Return info about the most recent running parse
        const current = runningParses[0]

        return Response.json({
            isRunning: true,
            username: (current as any).source?.username,
            startedAt: current.started_at,
            daysLimit: (current as any).source?.daysLimit,
            minViewsFilter: (current as any).source?.minViewsFilter,
            postsFound: current.postsFound
        })

    } catch (error) {
        console.error("Get status error:", error)
        return Response.json({ error: "Internal error" }, { status: 500 })
    }
}
