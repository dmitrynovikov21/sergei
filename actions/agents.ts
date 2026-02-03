/**
 * Agent Server Actions
 * 
 * Wrapper around AgentService with authentication and revalidation.
 * These are the public-facing server actions for components.
 */

"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import * as AgentService from "@/lib/services/agent"

// ==========================================
// Validation Schemas
// ==========================================

const createAgentSchema = z.object({
    name: z.string().min(1),
    role: z.string().optional(),
    description: z.string().optional(),
    systemPrompt: z.string().optional().default("You are a helpful AI assistant."),
    icon: z.string().optional(),
})

export type CreateAgentData = z.infer<typeof createAgentSchema>

// ==========================================
// Auth Helper
// ==========================================

async function requireAuth() {
    const session = await auth()
    if (!session?.user?.id) {
        throw new Error("Unauthorized")
    }
    return session.user.id
}

// ==========================================
// Read Actions
// ==========================================

export async function getAgents() {
    const session = await auth()
    if (!session?.user?.id) return []
    return AgentService.getAgentsByUser(session.user.id)
}

export async function getFeaturedAgents() {
    const session = await auth()
    return AgentService.getFeaturedAgents(session?.user?.id)
}

export async function getAgentById(id: string) {
    const session = await auth()
    return AgentService.getAgentById(id, session?.user?.id)
}

export async function getAgentWithFiles(agentId: string) {
    const session = await auth()
    if (!session?.user?.id) return null
    return AgentService.getAgentWithFiles(agentId, session.user.id)
}

// ==========================================
// Write Actions
// ==========================================

export async function createAgent(data: CreateAgentData) {
    const userId = await requireAuth()
    const { name, role, description, systemPrompt, icon } = createAgentSchema.parse(data)

    await AgentService.createAgent({
        userId,
        name,
        description: description || role,
        systemPrompt,
        emoji: icon
    })

    // Aggressive revalidation to show agent immediately in sidebar
    revalidatePath("/", "layout")
    revalidatePath("/dashboard", "layout")
    revalidatePath("/dashboard/agents")
    revalidatePath("/dashboard/agents", "page")
}

export async function updateAgentIcon(agentId: string, icon: string) {
    const userId = await requireAuth()

    // Verify access
    if (!(await AgentService.canUserAccessAgent(agentId, userId))) {
        throw new Error("Agent not found")
    }

    await AgentService.updateAgentIcon(agentId, icon)

    revalidatePath("/dashboard/chat/[id]", "page")
    revalidatePath("/dashboard")
}

export async function updateAgentPrompt(agentId: string, systemPrompt: string) {
    const userId = await requireAuth()

    if (!(await AgentService.canUserAccessAgent(agentId, userId))) {
        throw new Error("Agent not found")
    }

    await AgentService.updateAgentPrompt(agentId, systemPrompt)

    revalidatePath("/dashboard", "layout")
    revalidatePath("/dashboard")
    revalidatePath("/dashboard/agents")
    revalidatePath("/dashboard/chat", "layout")
}

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
    const userId = await requireAuth()

    if (!(await AgentService.canUserAccessAgent(agentId, userId))) {
        throw new Error("Agent not found")
    }

    await AgentService.updateAgentSettings(agentId, settings)

    revalidatePath("/dashboard", "layout")
    revalidatePath(`/dashboard/agents/${agentId}`)
}

export async function toggleAgentFavorite(agentId: string) {
    const userId = await requireAuth()

    if (!(await AgentService.canUserAccessAgent(agentId, userId))) {
        throw new Error("Agent not found")
    }

    const agent = await AgentService.toggleAgentFavorite(agentId)

    revalidatePath("/dashboard", "layout")
    revalidatePath(`/dashboard/agents/${agentId}`)

    return agent.isFavorite
}

export async function updateAgentDataset(agentId: string, datasetId: string | null) {
    const userId = await requireAuth()

    if (!(await AgentService.canUserAccessAgent(agentId, userId))) {
        throw new Error("Agent not found")
    }

    await prisma.agent.update({
        where: { id: agentId },
        data: { datasetId }
    })

    revalidatePath("/dashboard", "layout")
    revalidatePath(`/dashboard/agents/${agentId}`)
}

// ==========================================
// File Actions
// ==========================================

export async function addAgentFile(
    agentId: string,
    name: string,
    content: string,
    type?: string
) {
    const userId = await requireAuth()

    if (!(await AgentService.canUserAccessAgent(agentId, userId))) {
        throw new Error("Agent not found")
    }

    const file = await AgentService.addAgentFile(agentId, name, content, type)

    revalidatePath("/dashboard", "layout")
    revalidatePath("/dashboard")

    return file
}

export async function deleteAgentFile(fileId: string) {
    const userId = await requireAuth()

    // Need to get file first to check agent access
    // This is handled in the service with proper error
    await AgentService.deleteAgentFile(fileId)

    revalidatePath("/dashboard")
}

export async function deleteAgent(agentId: string) {
    try {
        const userId = await requireAuth()

        // Find agent and verify ownership
        const agent = await prisma.agent.findUnique({
            where: { id: agentId }
        })

        if (!agent) {
            return { success: false, error: "Agent not found" }
        }

        // Only allow deleting user's own agents (non-public)
        if (agent.userId !== userId || agent.isPublic) {
            return { success: false, error: "Cannot delete this agent (permission denied)" }
        }

        // Use transaction to ensure complete cleanup
        await prisma.$transaction(async (tx) => {
            // 1. Delete all files
            await tx.agentFile.deleteMany({ where: { agentId } })

            // 2. Delete chats and messages
            const chats = await tx.chat.findMany({
                where: { agentId },
                select: { id: true }
            })
            const chatIds = chats.map(c => c.id)

            if (chatIds.length > 0) {
                await tx.message.deleteMany({
                    where: { chatId: { in: chatIds } }
                })
                await tx.chat.deleteMany({
                    where: { id: { in: chatIds } }
                })
            }

            // 3. Delete agent
            await tx.agent.delete({
                where: { id: agentId }
            })
        })

        revalidatePath("/dashboard")
        revalidatePath("/dashboard/agents")
        return { success: true }

    } catch (error) {
        console.error("[deleteAgent] Error:", error)
        return {
            success: false,
            error: error instanceof Error ? error.message : "Database error"
        }
    }
}
