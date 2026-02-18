"use client"

import type { Agent, AgentFile } from "@prisma/client"
import { useStartChat } from "@/hooks/use-start-chat"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"
import { useState } from "react"

interface AgentGridProps {
    agents: (Agent & { files?: AgentFile[] })[]
}

/**
 * Unique gradient palette for each agent card.
 * Inspired by Claude's colorful artifact cards.
 */
const CARD_GRADIENTS = [
    // Warm coral → peach
    { from: "#E8634A", to: "#F4A582", emoji_bg: "rgba(255,255,255,0.2)" },
    // Ocean blue → sky
    { from: "#4A90D9", to: "#82C4F4", emoji_bg: "rgba(255,255,255,0.2)" },
    // Emerald → mint
    { from: "#3BB077", to: "#82E8B5", emoji_bg: "rgba(255,255,255,0.2)" },
    // Purple → lavender
    { from: "#8B5CF6", to: "#C4B5FD", emoji_bg: "rgba(255,255,255,0.2)" },
    // Amber → gold
    { from: "#D97706", to: "#FCD34D", emoji_bg: "rgba(255,255,255,0.2)" },
    // Rose → pink
    { from: "#E11D48", to: "#FDA4AF", emoji_bg: "rgba(255,255,255,0.2)" },
    // Teal → cyan
    { from: "#0D9488", to: "#67E8F9", emoji_bg: "rgba(255,255,255,0.2)" },
    // Indigo → blue
    { from: "#6366F1", to: "#A5B4FC", emoji_bg: "rgba(255,255,255,0.2)" },
    // Slate → neutral (fallback)
    { from: "#64748B", to: "#94A3B8", emoji_bg: "rgba(255,255,255,0.2)" },
]

function getGradient(index: number) {
    return CARD_GRADIENTS[index % CARD_GRADIENTS.length]
}

export function AgentGrid({ agents }: AgentGridProps) {
    const { startChat } = useStartChat()
    const [loadingId, setLoadingId] = useState<string | null>(null)

    const handleAgentClick = (agentId: string) => {
        setLoadingId(agentId)
        startChat(agentId)
    }

    // Deduplicate agents
    const deduplicatedAgents = agents.filter((agent, index, self) =>
        index === self.findIndex(a => a.name === agent.name)
    )

    return (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {deduplicatedAgents.map((agent, i) => {
                const gradient = getGradient(i)
                const isLoading = loadingId === agent.id

                return (
                    <div
                        key={agent.id}
                        onClick={() => handleAgentClick(agent.id)}
                        className={cn(
                            "group relative cursor-pointer rounded-2xl overflow-hidden",
                            "bg-card border border-border/30",
                            "transition-all duration-300 ease-out",
                            "hover:shadow-lg hover:shadow-black/20",
                            "hover:-translate-y-0.5",
                            "hover:border-border/60",
                            isLoading && "opacity-70 pointer-events-none"
                        )}
                    >
                        {/* Loading overlay */}
                        {isLoading && (
                            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
                                <Loader2 className="h-8 w-8 animate-spin text-white" />
                            </div>
                        )}

                        {/* Gradient header with emoji */}
                        <div
                            className="relative h-[140px] flex items-center justify-center overflow-hidden"
                            style={{
                                background: `linear-gradient(135deg, ${gradient.from} 0%, ${gradient.to} 100%)`,
                            }}
                        >
                            {/* Subtle pattern overlay */}
                            <div className="absolute inset-0 opacity-[0.08]"
                                style={{
                                    backgroundImage: `radial-gradient(circle at 20% 80%, white 1px, transparent 1px),
                                                      radial-gradient(circle at 80% 20%, white 1px, transparent 1px)`,
                                    backgroundSize: '40px 40px',
                                }}
                            />

                            {/* Large emoji */}
                            <span className="text-6xl select-none drop-shadow-sm transition-transform duration-300 group-hover:scale-110">
                                {agent.emoji || "🤖"}
                            </span>
                        </div>

                        {/* Content section */}
                        <div className="p-5">
                            <h3 className="text-[15px] font-semibold text-foreground mb-1.5 leading-tight">
                                {agent.name}
                            </h3>
                            <p className="text-[13px] text-muted-foreground leading-relaxed line-clamp-2">
                                {agent.description || "Нажмите, чтобы начать диалог с этим агентом."}
                            </p>

                            {(agent as any).dataset && (
                                <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground/80 bg-muted/40 w-fit px-2 py-1 rounded-md">
                                    <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                                    </svg>
                                    <span className="truncate max-w-[150px]">{(agent as any).dataset.name}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
