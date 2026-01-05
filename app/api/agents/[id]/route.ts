import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const agent = await prisma.agent.findFirst({
            where: {
                id: params.id,
                OR: [
                    { userId: session.user.id },
                    { isPublic: true }
                ]
            },
            include: {
                files: {
                    orderBy: { createdAt: "desc" }
                }
            }
        })

        if (!agent) {
            return NextResponse.json({ error: "Agent not found" }, { status: 404 })
        }

        return NextResponse.json(agent)
    } catch (error) {
        console.error("Get agent error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
