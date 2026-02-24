"use server"

import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth-helpers"

export interface FeedbackItem {
    id: string
    content: string
    feedback: string
    feedbackText: string | null
    createdAt: Date
    chatId: string
    agentName: string | null
    userName: string | null
    userEmail: string | null
}

export interface FeedbackStats {
    totalLikes: number
    totalDislikes: number
    totalWithText: number
    byAgent: { name: string; likes: number; dislikes: number }[]
    recentItems: FeedbackItem[]
}

export async function getFeedbackStats(): Promise<FeedbackStats> {
    await requireAuth()

    // Get all messages with feedback
    const messagesWithFeedback = await prisma.message.findMany({
        where: {
            feedback: { not: null },
        },
        select: {
            id: true,
            content: true,
            feedback: true,
            feedbackText: true,
            createdAt: true,
            chatId: true,
            chat: {
                select: {
                    agentId: true,
                    agent: {
                        select: { name: true },
                    },
                    user: {
                        select: { name: true, email: true },
                    },
                },
            },
        },
        orderBy: { createdAt: "desc" },
    })

    const totalLikes = messagesWithFeedback.filter(m => m.feedback === "like").length
    const totalDislikes = messagesWithFeedback.filter(m => m.feedback === "dislike").length
    const totalWithText = messagesWithFeedback.filter(m => m.feedbackText).length

    // Group by agent
    const agentMap = new Map<string, { likes: number; dislikes: number }>()
    for (const msg of messagesWithFeedback) {
        const agentName = msg.chat?.agent?.name || "Без агента"
        const entry = agentMap.get(agentName) || { likes: 0, dislikes: 0 }
        if (msg.feedback === "like") entry.likes++
        if (msg.feedback === "dislike") entry.dislikes++
        agentMap.set(agentName, entry)
    }

    const byAgent = Array.from(agentMap.entries()).map(([name, stats]) => ({
        name,
        ...stats,
    }))

    const recentItems: FeedbackItem[] = messagesWithFeedback.slice(0, 100).map(m => ({
        id: m.id,
        content: m.content,
        feedback: m.feedback!,
        feedbackText: m.feedbackText,
        createdAt: m.createdAt!,
        chatId: m.chatId,
        agentName: m.chat?.agent?.name || null,
        userName: m.chat?.user?.name || null,
        userEmail: m.chat?.user?.email || null,
    }))

    return { totalLikes, totalDislikes, totalWithText, byAgent, recentItems }
}
