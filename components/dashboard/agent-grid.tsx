"use client"

import type { Agent, AgentFile } from "@prisma/client"
import { useStartChat } from "@/hooks/use-start-chat"
import { cn } from "@/lib/utils"
import { Settings, Loader2 } from "lucide-react"
import { EditAgentDialog } from "./edit-agent-dialog"
import { CreateAgentDialog } from "./create-agent-dialog"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
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

    // Deduplicate agents - keep only unique by name, prioritizing first occurrence
    const deduplicatedAgents = agents.filter((agent, index, self) =>
        index === self.findIndex(a => a.name === agent.name)
    )

    return (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {deduplicatedAgents.map((agent) => (
                <div
                    key={agent.id}
                    onClick={() => handleAgentClick(agent.id)}
                    className={cn(
                        "group relative cursor-pointer rounded-xl border border-border/50",
                        "bg-card dark:bg-[#30302E]",
                        "p-6 h-full",
                        "transition-all duration-300 ease-out",
                        "hover:border-border",
                        "hover:shadow-lg",
                        "hover:-translate-y-1 hover:scale-[1.01]",
                        loadingId === agent.id && "opacity-70 pointer-events-none"
                    )}
                >
                    {loadingId === agent.id && (
                        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-xl bg-black/50 backdrop-blur-[1px]">
                            <Loader2 className="h-8 w-8 animate-spin text-white" />
                        </div>
                    )}
                    {/* Settings button */}
                    <div
                        className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <EditAgentDialog
                            agent={agent}
                            trigger={
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-full bg-muted/80 backdrop-blur-sm hover:bg-muted text-muted-foreground hover:text-foreground"
                                >
                                    <Settings className="h-4 w-4" />
                                </Button>
                            }
                        />
                    </div>

                    {/* Agent content */}
                    <div className="flex flex-col h-full">
                        {/* Text - NO icon */}
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-accent transition-colors">
                                {agent.name}
                            </h3>
                            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                                {agent.description || "Нажмите, чтобы начать диалог с этим агентом."}
                            </p>

                            {(agent as any).dataset && (
                                <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground bg-muted w-fit px-2 py-1 rounded-md">
                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                                    </svg>
                                    <span className="truncate max-w-[150px]">{(agent as any).dataset.name}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}
