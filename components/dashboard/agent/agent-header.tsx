"use client"

import { useState, useTransition } from "react"
import { Agent } from "@prisma/client"
import { Star, MoreHorizontal } from "lucide-react"
import { toggleAgentFavorite } from "@/actions/agents"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface AgentHeaderProps {
    agent: Agent
}

export function AgentHeader({ agent }: AgentHeaderProps) {
    const [isFavorite, setIsFavorite] = useState(agent.isFavorite || false)
    const [isPending, startTransition] = useTransition()

    // Check agent types
    const isDescriptionAgent = agent.name.toLowerCase().includes("описание") || agent.name.toLowerCase().includes("description")
    const isHeadlinesAgent = agent.name.toLowerCase().includes("заголовк") || agent.name.toLowerCase().includes("headlines")

    // Show auto-update only for Headlines agents, not Description
    const showAutoUpdate = isHeadlinesAgent && !isDescriptionAgent

    const handleToggleFavorite = () => {
        startTransition(async () => {
            try {
                const newState = await toggleAgentFavorite(agent.id)
                setIsFavorite(newState)
                toast.success(newState ? "Добавлено в избранное" : "Удалено из избранного")
            } catch (error) {
                toast.error("Ошибка")
            }
        })
    }

    return (
        <div className="mb-10">
            {/* Title Row */}
            <div className="flex items-center gap-3">
                <span className="text-3xl">{agent.emoji || "🤖"}</span>
                <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white">{agent.name}</h1>
                <button
                    onClick={handleToggleFavorite}
                    disabled={isPending}
                    className={cn(
                        "transition-colors ml-2",
                        isFavorite
                            ? "text-yellow-500 hover:text-yellow-600"
                            : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                    )}
                >
                    <Star className={cn("h-5 w-5", isFavorite && "fill-current")} />
                </button>
            </div>

            {/* Auto-update indicator - UNDER the title row, only for Headlines */}
            {showAutoUpdate && (
                <div className="flex items-center gap-2 mt-2 ml-12">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    <span className="text-xs text-zinc-400">обновляется автоматически</span>
                </div>
            )}
        </div>
    )
}
