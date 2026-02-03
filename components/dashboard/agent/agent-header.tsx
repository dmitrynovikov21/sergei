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

            {/* Auto-update badge with pulsing green dot */}
            {showAutoUpdate && (
                <div className="flex items-center gap-2 mb-2">
                    <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                    </span>
                    <span className="text-xs text-muted-foreground">Обновляется автоматически</span>
                </div>
            )}

            {agent.description && (
                <p className="text-sm text-muted-foreground">{agent.description}</p>
            )}
        </div>
    )
}
