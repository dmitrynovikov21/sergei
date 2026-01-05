"use client"

import { useRouter } from "next/navigation"
import { Agent, AgentFile } from "@prisma/client"
import { createChat } from "@/actions/chat"
import { cn } from "@/lib/utils"
import { Settings } from "lucide-react"
import { EditAgentDialog } from "./edit-agent-dialog"
import { Button } from "@/components/ui/button"

interface AgentGridProps {
    agents: (Agent & { files?: AgentFile[] })[]
}

export function AgentGrid({ agents }: AgentGridProps) {
    const router = useRouter()

    const handleAgentClick = async (agentId: string) => {
        try {
            const chatId = await createChat(agentId)
            router.refresh()
            router.push(`/dashboard/chat/${chatId}`)
        } catch (error) {
            console.error("Failed to create chat:", error)
        }
    }

    return (
        <div className="grid gap-6 sm:grid-cols-2">
            {agents.map((agent) => (
                <div
                    key={agent.id}
                    onClick={() => handleAgentClick(agent.id)}
                    className={cn(
                        "group relative cursor-pointer rounded-2xl border border-zinc-200 dark:border-zinc-800",
                        "bg-white dark:bg-zinc-900 p-6",
                        "transition-all duration-200 ease-out",
                        "hover:border-zinc-400 dark:hover:border-zinc-600",
                        "hover:shadow-lg hover:shadow-zinc-200/50 dark:hover:shadow-zinc-900/50",
                        "hover:-translate-y-1"
                    )}
                >
                    {/* Settings button */}
                    <div
                        className="absolute top-4 right-4 z-10 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <EditAgentDialog
                            agent={agent}
                            trigger={
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                                >
                                    <Settings className="h-4 w-4 text-zinc-500" />
                                </Button>
                            }
                        />
                    </div>

                    {/* Agent content */}
                    <div className="flex items-start gap-5">
                        {/* Emoji */}
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-zinc-100 to-zinc-50 dark:from-zinc-800 dark:to-zinc-900 text-4xl shadow-inner">
                            {agent.emoji || "🤖"}
                        </div>

                        {/* Text */}
                        <div className="flex-1 min-w-0 pt-1">
                            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
                                {agent.name}
                            </h3>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                                {agent.description || "Нажмите, чтобы начать диалог"}
                            </p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}
