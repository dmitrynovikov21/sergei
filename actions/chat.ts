"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
// import { MessageRole } from "@prisma/client"

export async function createChat(agentId: string, projectId?: string) {
    console.log("[createChat] Starting for agentId:", agentId, "projectId:", projectId)
    const session = await auth()
    console.log("[createChat] Session:", session?.user?.id)

    if (!session?.user?.id) {
        console.error("[createChat] No session found")
        throw new Error("Unauthorized")
    }

    try {
        // Get agent name for chat title
        const agent = await prisma.agent.findUnique({
            where: { id: agentId },
            select: { name: true }
        })
        console.log("[createChat] Agent found:", agent?.name)

        const chat = await prisma.chat.create({
            data: {
                userId: session.user.id,
                agentId,
                projectId: projectId || null,
                title: agent?.name ? `Чат с ${agent.name}` : "Новый чат",
            },
        })
        console.log("[createChat] Chat created:", chat.id)

        revalidatePath("/dashboard", "layout")
        revalidatePath("/dashboard")
        return chat.id
    } catch (error) {
        console.error("[createChat] DB Error:", error)
        throw error
    }
}

export async function getUserChats() {
    const session = await auth()
    if (!session?.user?.id) return []

    return await prisma.chat.findMany({
        where: { userId: session.user.id },
        include: { agent: true },
        orderBy: { updatedAt: "desc" },
    })
}

export async function getAgentChats(agentId: string) {
    const session = await auth()
    if (!session?.user?.id) return []

    return await prisma.chat.findMany({
        where: {
            userId: session.user.id,
            agentId
        },
        orderBy: { updatedAt: "desc" },
    })
}

export async function getChat(chatId: string) {
    const session = await auth()
    if (!session?.user?.id) return null

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
    if (chat && chat.userId !== session.user.id) {
        return null
    }

    return chat
}

export async function saveMessage(chatId: string, role: string, content: string) {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")

    const message = await prisma.message.create({
        data: {
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
    revalidatePath(`/dashboard/chat/${chatId}`)
    return message
}

export async function deleteChat(chatId: string) {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")

    const chat = await prisma.chat.findUnique({
        where: { id: chatId },
    })

    if (!chat || chat.userId !== session.user.id) {
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
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")

    if (!newTitle.trim()) throw new Error("Title is required")

    const chat = await prisma.chat.findUnique({
        where: { id: chatId },
    })

    if (!chat || chat.userId !== session.user.id) {
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
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")

    const chat = await prisma.chat.findUnique({
        where: { id: chatId },
    })

    if (!chat || chat.userId !== session.user.id) {
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
