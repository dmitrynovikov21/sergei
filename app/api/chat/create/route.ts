import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/auth"

export async function POST(req: NextRequest) {
    const session = await auth()
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { agentId, datasetId } = await req.json()

    if (!agentId) {
        return NextResponse.json({ error: "Missing agentId" }, { status: 400 })
    }

    const chatId = crypto.randomUUID()

    // Create empty chat — message will be sent client-side via ChatInterface auto-send
    await prisma.chat.create({
        data: {
            id: chatId,
            userId: session.user.id,
            agentId,
            ...(datasetId ? { datasetId } : {}),
        },
    })

    return NextResponse.json({ chatId })
}
