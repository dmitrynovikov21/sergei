"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const agentSchema = z.object({
    name: z.string().min(1),
    role: z.string().optional(),
    description: z.string().optional(),
    systemPrompt: z.string().min(1),
    icon: z.string().optional(),
})

export type CreateAgentData = z.infer<typeof agentSchema>

export async function createAgent(data: CreateAgentData) {
    const session = await auth()

    console.log("createAgent session:", session)
    if (!session?.user || !session.user.id) {
        throw new Error("Unauthorized: No session or user ID found.")
    }

    const { name, role, description, systemPrompt, icon } = agentSchema.parse(data)

    // Use role as description if description is not provided, or combine them
    const finalDescription = description || role

    await prisma.agent.create({
        data: {
            userId: session.user.id,
            name,
            description: finalDescription,
            systemPrompt,
            emoji: icon,
        },
    })

    revalidatePath("/dashboard", "layout")
    revalidatePath("/dashboard/agents")
}

export async function getAgents() {
    const session = await auth()

    if (!session?.user || !session.user.id) {
        return []
    }

    const agents = await prisma.agent.findMany({
        where: {
            OR: [
                { userId: session.user.id },
                { isPublic: true }
            ],
            name: { not: "Claude Assistant" }
        },
        orderBy: {
            createdAt: "desc",
        },
    })

    return agents
}

export async function getFeaturedAgents() {
    const session = await auth()

    // Return agents that are public OR belong to the current user
    const agents = await prisma.agent.findMany({
        where: {
            OR: [
                { isPublic: true },
                ...(session?.user?.id ? [{ userId: session.user.id }] : [])
            ],
            name: { not: "Claude Assistant" }
        },
        include: {
            files: {
                orderBy: { createdAt: "desc" }
            }
        },
        orderBy: {
            createdAt: "desc",
        },
    })

    return agents
}

export async function getAgentById(id: string) {
    const session = await auth()

    // First try to find a public agent (no auth required)
    const publicAgent = await prisma.agent.findFirst({
        where: {
            id,
            isPublic: true,
        },
    })

    if (publicAgent) {
        return publicAgent
    }

    // If not public, require auth and check user ownership
    if (!session?.user || !session.user.id) {
        return null
    }

    const agent = await prisma.agent.findFirst({
        where: {
            id,
            userId: session.user.id,
        },
    })

    return agent
}

export async function updateAgentIcon(agentId: string, icon: string) {
    const session = await auth()

    if (!session?.user || !session.user.id) {
        throw new Error("Unauthorized")
    }

    await prisma.agent.update({
        where: {
            id: agentId,
            userId: session.user.id,
        },
        data: {
            emoji: icon,
        },
    })

    revalidatePath("/dashboard/chat/[id]", "page")
    revalidatePath("/dashboard")
}

// Update agent system prompt
export async function updateAgentPrompt(agentId: string, systemPrompt: string) {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")

    // Check if agent exists and user has access
    const agent = await prisma.agent.findFirst({
        where: {
            id: agentId,
            OR: [
                { userId: session.user.id },
                { isPublic: true }
            ]
        }
    })

    if (!agent) throw new Error("Agent not found")

    // Update the agent - allow for both user's own agents and public agents
    await prisma.agent.update({
        where: { id: agentId },
        data: { systemPrompt }
    })

    // Revalidate all pages that might show agent data
    revalidatePath("/dashboard", "layout")
    revalidatePath("/dashboard")
    revalidatePath("/dashboard/agents")
    revalidatePath("/dashboard/chat", "layout")
}

// Update agent chat settings (toggles) - writes directly to systemPrompt
export async function updateAgentSettings(
    agentId: string,
    settings: {
        useEmoji?: boolean
        useSubscribe?: boolean
        useLinkInBio?: boolean
        codeWord?: string
        audienceQuestion?: string
    }
) {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")

    // Check if agent exists and user has access
    const agent = await prisma.agent.findFirst({
        where: {
            id: agentId,
            OR: [
                { userId: session.user.id },
                { isPublic: true }
            ]
        }
    })

    if (!agent) throw new Error("Agent not found")

    // Merge current settings with new ones
    const currentSettings = {
        useEmoji: agent.useEmoji ?? false,
        useSubscribe: agent.useSubscribe ?? false,
        useLinkInBio: agent.useLinkInBio ?? false,
        codeWord: agent.codeWord ?? "",
        audienceQuestion: agent.audienceQuestion ?? ""
    }

    const newSettings = { ...currentSettings, ...settings }

    // Update the agent with new settings ONLY. 
    // System prompt modification is now handled 100% client-side in EditAgentDialog (or via specific updateAgentPrompt calls).
    // This prevents "Zombie" text injection like "=== НАСТРОЙКА ===".

    await prisma.agent.update({
        where: { id: agentId },
        data: {
            ...settings
        }
    })

    // Revalidate to sync UI
    revalidatePath("/dashboard", "layout")
    revalidatePath(`/dashboard/agents/${agentId}`)
}

// Toggle agent favorite status
export async function toggleAgentFavorite(agentId: string) {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")

    const agent = await prisma.agent.findFirst({
        where: {
            id: agentId,
            OR: [
                { userId: session.user.id },
                { isPublic: true }
            ]
        }
    })

    if (!agent) throw new Error("Agent not found")

    const updated = await prisma.agent.update({
        where: { id: agentId },
        data: { isFavorite: !agent.isFavorite }
    })

    revalidatePath("/dashboard", "layout")
    revalidatePath(`/dashboard/agents/${agentId}`)

    return updated.isFavorite
}

// Get agent with files
export async function getAgentWithFiles(agentId: string) {
    const session = await auth()
    if (!session?.user?.id) return null

    const agent = await prisma.agent.findFirst({
        where: {
            id: agentId,
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

    return agent
}

// Add file to agent
export async function addAgentFile(agentId: string, name: string, content: string, type?: string) {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")

    // Verify agent access
    const agent = await prisma.agent.findFirst({
        where: {
            id: agentId,
            OR: [
                { userId: session.user.id },
                { isPublic: true }
            ]
        }
    })

    if (!agent) throw new Error("Agent not found")

    const file = await prisma.agentFile.create({
        data: {
            agentId,
            name,
            content,
            type
        }
    })

    revalidatePath("/dashboard", "layout")
    revalidatePath("/dashboard")
    return file
}

// Delete agent file
export async function deleteAgentFile(fileId: string) {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")

    const file = await prisma.agentFile.findUnique({
        where: { id: fileId },
        include: { agent: true }
    })

    if (!file) throw new Error("File not found")

    // Check access
    if (file.agent.userId !== session.user.id && !file.agent.isPublic) {
        throw new Error("Unauthorized")
    }

    await prisma.agentFile.delete({
        where: { id: fileId }
    })

    revalidatePath("/dashboard")
}

