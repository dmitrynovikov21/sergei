"use client"

import { useRouter } from "next/navigation"
import { Agent, AgentFile } from "@prisma/client"
import { createChat } from "@/actions/chat"
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
    const router = useRouter()
    const [loadingId, setLoadingId] = useState<string | null>(null)

    const handleAgentClick = (agentId: string) => {
        router.push(`/dashboard/agents/${agentId}`)
    }

    return (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent) => (
                <div
                    key={agent.id}
                    onClick={() => handleAgentClick(agent.id)}
                    className={cn(
                        "group relative cursor-pointer rounded-3xl border border-zinc-100 dark:border-zinc-800",
                        "bg-white dark:bg-zinc-900",
                        "p-6 h-full",
                        "transition-all duration-300 ease-out",
                        "hover:border-zinc-200 dark:hover:border-zinc-700",
                        "hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:hover:shadow-none",
                        "hover:-translate-y-1 hover:scale-[1.01]",
                        loadingId === agent.id && "opacity-70 pointer-events-none"
                    )}
                >
                    {loadingId === agent.id && (
                        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-3xl bg-white/50 dark:bg-black/50 backdrop-blur-[1px]">
                            <Loader2 className="h-8 w-8 animate-spin text-zinc-900 dark:text-white" />
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
                                    className="h-8 w-8 rounded-full bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-400 hover:text-zinc-600"
                                >
                                    <Settings className="h-4 w-4" />
                                </Button>
                            }
                        />
                    </div>

                    {/* Agent content */}
                    <div className="flex flex-col h-full">
                        {/* Icon */}
                        <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-50 dark:bg-zinc-800 text-4xl shadow-sm ring-1 ring-zinc-900/5 dark:ring-white/10 group-hover:bg-zinc-100 dark:group-hover:bg-zinc-700 transition-colors">
                            {agent.emoji || "🤖"}
                        </div>

                        {/* Text */}
                        <div className="flex-1">
                            <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                {agent.name}
                            </h3>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed line-clamp-3">
                                {agent.description || "Нажмите, чтобы начать диалог с этим агентом. Он поможет вам в решении задач."}
                            </p>

                            {/* Dataset Badge */}
                            {(agent as any).dataset && (
                                <div className="mt-3 flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/50 w-fit px-2 py-1 rounded-md">
                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                                    </svg>
                                    <span className="truncate max-w-[150px]">{(agent as any).dataset.name}</span>
                                </div>
                            )}
                        </div>

                        {/* Footer arrow (optional visual cue) */}
                        <div className="mt-6 flex items-center text-sm font-medium text-zinc-300 dark:text-zinc-600 group-hover:text-zinc-900 dark:group-hover:text-zinc-200 transition-colors">
                            <span>Начать чат</span>
                            <svg className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m-4-4H3" />
                            </svg>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}
