"use client"

import type { Agent, AgentFile } from "@prisma/client"
import { useStartChat } from "@/hooks/use-start-chat"
import { cn } from "@/lib/utils"
import { Loader2, ArrowRight } from "lucide-react"
import { useState } from "react"

interface AgentGridProps {
    agents: (Agent & { files?: AgentFile[] })[]
}

export function AgentGrid({ agents }: AgentGridProps) {
    const { startChat } = useStartChat()
    const [loadingId, setLoadingId] = useState<string | null>(null)

    const handleAgentClick = (agentId: string) => {
        setLoadingId(agentId)
        startChat(agentId)
    }

    const deduplicatedAgents = agents.filter((agent, index, self) =>
        index === self.findIndex(a => a.name === agent.name)
    )

    return (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {deduplicatedAgents.map((agent) => {
                const isLoading = loadingId === agent.id

                return (
                    <div
                        key={agent.id}
                        onClick={() => handleAgentClick(agent.id)}
                        className={cn(
                            "group relative cursor-pointer",
                            "rounded-xl border border-border/40",
                            "bg-card/50",
                            "p-5",
                            "transition-all duration-200 ease-out",
                            "hover:bg-card hover:border-border/80",
                            isLoading && "opacity-60 pointer-events-none"
                        )}
                    >
                        {isLoading && (
                            <div className="absolute inset-0 z-20 flex items-center justify-center rounded-xl bg-black/30 backdrop-blur-[1px]">
                                <Loader2 className="h-5 w-5 animate-spin text-foreground/70" />
                            </div>
                        )}

                        <div className="flex flex-col gap-2">
                            <h3 className="text-[15px] font-medium text-foreground leading-tight">
                                {agent.name}
                            </h3>
                            <p className="text-[13px] text-muted-foreground leading-relaxed line-clamp-2">
                                {agent.description || "Нажмите, чтобы начать диалог"}
                            </p>
                        </div>

                        {/* Subtle arrow on hover */}
                        <div className="absolute top-5 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <ArrowRight className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
