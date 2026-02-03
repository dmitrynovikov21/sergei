"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { requireAuth, getCurrentUser } from "@/lib/auth-helpers"

// ==========================================
// Chat CRUD Actions
// ==========================================

export async function createChat(agentId: string, projectId?: string, datasetId?: string) {
    const user = await requireAuth()

    try {
        // Get agent name for chat title
        const agent = await prisma.agent.findUnique({
            where: { id: agentId },
            select: { name: true }
        })

        const chat = await prisma.chat.create({
            data: {
                id: crypto.randomUUID(),
                userId: user.id,
                agentId,
                projectId: projectId || null,
                datasetId: datasetId || null,
                title: agent?.name ? `Чат с ${agent.name}` : "Новый чат",
            },
        })

        revalidatePath("/dashboard", "layout")
        revalidatePath("/dashboard")
        return chat.id
    } catch (error) {
        console.error("[createChat] DB Error:", error)
        throw error
    }
}

export async function getUserChats() {
    const user = await getCurrentUser()
    if (!user) return []

    return await prisma.chat.findMany({
        where: { userId: user.id },
        include: { agent: true },
        orderBy: { updatedAt: "desc" },
    })
}

export async function getAgentChats(agentId: string) {
    const user = await getCurrentUser()
    if (!user) return []

    return await prisma.chat.findMany({
        where: {
            userId: user.id,
            agentId
        },
        orderBy: { updatedAt: "desc" },
    })
}

export async function getChat(chatId: string) {
    const user = await getCurrentUser()
    if (!user) return null

    const chat = await prisma.chat.findUnique({
        where: { id: chatId },
        include: {
            agent: true,
            messages: {
                orderBy: { createdAt: "asc" },
                include: {
                    attachments: true
                }
            },
        },
    })

    // Security check
    if (chat && chat.userId !== user.id) {
        return null
    }

    return chat
}

export async function saveMessage(chatId: string, role: string, content: string) {
    await requireAuth()

    const message = await prisma.message.create({
        data: {
            id: crypto.randomUUID(),
            chatId,
            role,
            content,
        },
    })

    // Update chat updated_at
    await prisma.chat.update({
        where: { id: chatId },
        data: { updatedAt: new Date() },
    })

    revalidatePath(`/dashboard/chat/${chatId}`)
    return message
}

export async function deleteChat(chatId: string) {
    const user = await requireAuth()

    const chat = await prisma.chat.findUnique({
        where: { id: chatId },
    })

    if (!chat || chat.userId !== user.id) {
        throw new Error("Unauthorized")
    }

    await prisma.chat.delete({
        where: { id: chatId },
    })

    // Revalidate multiple paths to ensure sidebar and all pages update
    revalidatePath("/dashboard", "layout")
    revalidatePath("/dashboard")
    revalidatePath("/dashboard/chat")
    return { success: true }
}

export async function renameChat(chatId: string, newTitle: string) {
    const user = await requireAuth()

    if (!newTitle.trim()) throw new Error("Title is required")

    const chat = await prisma.chat.findUnique({
        where: { id: chatId },
    })

    if (!chat || chat.userId !== user.id) {
        throw new Error("Unauthorized")
    }

    await prisma.chat.update({
        where: { id: chatId },
        data: { title: newTitle.trim() },
    })

    revalidatePath("/dashboard")
    return { success: true }
}

export async function moveChatToProject(chatId: string, projectId: string) {
    const user = await requireAuth()

    const chat = await prisma.chat.findUnique({
        where: { id: chatId },
    })

    if (!chat || chat.userId !== user.id) {
        throw new Error("Unauthorized")
    }

    await prisma.chat.update({
        where: { id: chatId },
        data: { projectId },
    })

    revalidatePath("/dashboard")
    return { success: true }
}

export const updateChatProject = moveChatToProject
