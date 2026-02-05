"use client"

import { Agent } from "@prisma/client"

interface AgentHeaderProps {
    agent: Agent
}

export function AgentHeader({ agent }: AgentHeaderProps) {
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
