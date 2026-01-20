/**
 * Agent Service
 * 
 * Core database operations for agents.
 * This module contains pure data access functions without auth checks.
 * Auth should be handled in the calling layer (actions or API routes).
 */

import { prisma } from "@/lib/db"
import { Agent } from "@prisma/client"

// ==========================================
// Types
// ==========================================

export interface CreateAgentInput {
    userId: string
    name: string
    description?: string
    systemPrompt?: string
    emoji?: string
    isPublic?: boolean
}

export interface UpdateAgentSettingsInput {
    name?: string
    useEmoji?: boolean
    useSubscribe?: boolean
    useLinkInBio?: boolean
    codeWord?: string
    audienceQuestion?: string
    subscribeLink?: string
}

export type AgentWithFiles = Agent & {
    files: { id: string; name: string; content: string; type: string | null }[]
}

// ==========================================
// Read Operations
// ==========================================

/**
 * Get all agents accessible by a user (owned + public)
 * Public (system) agents come first, then user's agents
 */
export async function getAgentsByUser(userId: string): Promise<Agent[]> {
    return prisma.agent.findMany({
        where: {
            OR: [
                { userId },
                { isPublic: true }
            ],
            name: { not: "Claude Assistant" }
        },
        orderBy: [
            { isPublic: "desc" }, // Public (system) agents first
            { createdAt: "desc" }
        ]
    })
}

/**
 * Get public agents (for unauthenticated access)
 */
export async function getPublicAgents(): Promise<Agent[]> {
    return prisma.agent.findMany({
        where: {
            isPublic: true,
            name: { not: "Claude Assistant" }
        },
        orderBy: { createdAt: "desc" }
    })
}

/**
 * Get agent by ID with optional user ownership check
 */
export async function getAgentById(
    agentId: string,
    userId?: string
): Promise<Agent | null> {
    // First check public agents
    const publicAgent = await prisma.agent.findFirst({
        where: { id: agentId, isPublic: true }
    })
    if (publicAgent) return publicAgent

    // If user provided, check their agents
    if (userId) {
        return prisma.agent.findFirst({
            where: { id: agentId, userId }
        })
    }

    return null
}

/**
 * Get agent with its files
 */
export async function getAgentWithFiles(
    agentId: string,
    userId?: string
): Promise<AgentWithFiles | null> {
    const agent = await prisma.agent.findFirst({
        where: {
            id: agentId,
            OR: [
                { isPublic: true },
                ...(userId ? [{ userId }] : [])
            ]
        },
        include: {
            files: { orderBy: { createdAt: "desc" } }
        }
    })
    return agent as AgentWithFiles | null
}

/**
 * Get featured agents (public + user's own)
 */
export async function getFeaturedAgents(userId?: string): Promise<AgentWithFiles[]> {
    const agents = await prisma.agent.findMany({
        where: {
            OR: [
                { isPublic: true },
                ...(userId ? [{ userId }] : [])
            ],
            name: { not: "Claude Assistant" }
        },
        include: {
            files: { orderBy: { createdAt: "desc" } },
            dataset: { select: { name: true, id: true } }
        },
        orderBy: { createdAt: "desc" }
    })
    return agents as AgentWithFiles[]
}

// ==========================================
// Write Operations
// ==========================================

/**
 * Create a new agent
 */
export async function createAgent(input: CreateAgentInput): Promise<Agent> {
    return prisma.agent.create({
        data: {
            userId: input.userId,
            name: input.name,
            description: input.description,
            systemPrompt: input.systemPrompt || "You are a helpful AI assistant.",
            emoji: input.emoji,
            isPublic: input.isPublic || false
        }
    })
}

/**
 * Update agent's system prompt
 */
export async function updateAgentPrompt(
    agentId: string,
    systemPrompt: string
): Promise<Agent> {
    return prisma.agent.update({
        where: { id: agentId },
        data: { systemPrompt }
    })
}

/**
 * Update agent's icon/emoji
 */
export async function updateAgentIcon(
    agentId: string,
    emoji: string
): Promise<Agent> {
    return prisma.agent.update({
        where: { id: agentId },
        data: { emoji }
    })
}

/**
 * Update agent settings (custom fields for description agents)
 */
export async function updateAgentSettings(
    agentId: string,
    settings: UpdateAgentSettingsInput
): Promise<Agent> {
    return prisma.agent.update({
        where: { id: agentId },
        data: settings as any // Custom fields
    })
}

/**
 * Toggle agent favorite status
 */
export async function toggleAgentFavorite(agentId: string): Promise<Agent> {
    const agent = await prisma.agent.findUnique({ where: { id: agentId } })
    if (!agent) throw new Error("Agent not found")

    return prisma.agent.update({
        where: { id: agentId },
        data: { isFavorite: !agent.isFavorite }
    })
}

// ==========================================
// File Operations
// ==========================================

/**
 * Add a file to an agent's knowledge base
 */
export async function addAgentFile(
    agentId: string,
    name: string,
    content: string,
    type?: string
) {
    return prisma.agentFile.create({
        data: {
            agentId,
            name,
            content,
            type: type || "text/plain"
        }
    })
}

/**
 * Delete an agent file
 */
export async function deleteAgentFile(fileId: string) {
    return prisma.agentFile.delete({
        where: { id: fileId }
    })
}

/**
 * Check if user can access an agent
 */
export async function canUserAccessAgent(
    agentId: string,
    userId: string
): Promise<boolean> {
    const agent = await prisma.agent.findFirst({
        where: {
            id: agentId,
            OR: [
                { userId },
                { isPublic: true }
            ]
        }
    })
    return !!agent
}
