"use client"

import { Agent } from "@prisma/client"

interface AgentHeaderProps {
    agent: Agent
}

export function AgentHeader({ agent }: AgentHeaderProps) {
    // Check agent types
    const isDescriptionAgent = agent.name.toLowerCase().includes("описание") || agent.name.toLowerCase().includes("description")
    const isHeadlinesAgent = agent.name.toLowerCase().includes("заголовк") || agent.name.toLowerCase().includes("headlines")

    // Show auto-update only for Headlines agents, not Description
    const showAutoUpdate = isHeadlinesAgent && !isDescriptionAgent

    return (
        <div className="mb-6">
            {/* Title Row - NO EMOJI */}
            <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-semibold text-foreground">{agent.name}</h1>
            </div>

            {agent.description && (
                <p className="text-sm text-muted-foreground">{agent.description}</p>
            )}
        </div>
    )
}
