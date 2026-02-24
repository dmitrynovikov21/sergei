import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/auth"

export async function POST(req: NextRequest) {
    const session = await auth()
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { agentId, initialMessage } = await req.json()

    if (!agentId) {
        return NextResponse.json({ error: "Missing agentId" }, { status: 400 })
    }

    const chatId = crypto.randomUUID()

    // Create chat
    await prisma.chat.create({
        data: {
            id: chatId,
            userId: session.user.id,
            agentId,
        },
    })

    // If initial message provided, create user message
    if (initialMessage) {
        await prisma.message.create({
            data: {
                id: crypto.randomUUID(),
                chatId,
                role: "user",
                content: initialMessage,
                chat: { connect: { id: chatId } },
            },
        })
    }

    return NextResponse.json({ chatId })
}
