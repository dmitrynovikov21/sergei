import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/auth"

export async function POST(req: NextRequest) {
    const session = await auth()
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { messageId, chatId, feedback, feedbackText } = await req.json()

    if (!messageId || !feedback) {
        return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }

    try {
        // Try direct update
        await prisma.message.update({
            where: { id: messageId },
            data: {
                feedback,
                feedbackText: feedbackText?.trim() || null,
            },
        })
    } catch {
        // Fallback: find latest assistant message in chat
        const msg = await prisma.message.findFirst({
            where: {
                role: "assistant",
                ...(chatId ? { chatId } : {}),
            },
            orderBy: { createdAt: "desc" },
        })
        if (msg) {
            await prisma.message.update({
                where: { id: msg.id },
                data: {
                    feedback,
                    feedbackText: feedbackText?.trim() || null,
                },
            })
        }
    }

    return NextResponse.json({ success: true })
}
