"use client"

import type { Agent, AgentFile } from "@prisma/client"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { ArrowRight } from "lucide-react"

interface AgentGridProps {
    agents: (Agent & { files?: AgentFile[] })[]
}

export function AgentGrid({ agents }: AgentGridProps) {
    const router = useRouter()

    const deduplicatedAgents = agents.filter((agent, index, self) =>
        index === self.findIndex(a => a.name === agent.name)
    )

    return (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {deduplicatedAgents.map((agent) => (
                <div
                    key={agent.id}
                    onClick={() => router.push(`/dashboard/agents/${agent.id}`)}
                    className={cn(
                        "group relative cursor-pointer",
                        "rounded-xl border border-border/40",
                        "bg-card/50",
                        "p-5",
                        "transition-all duration-200 ease-out",
                        "hover:bg-card hover:border-border/80",
                    )}
                >
                    <div className="flex flex-col gap-2">
                        <h3 className="text-[15px] font-medium text-foreground leading-tight">
                            {agent.name}
                        </h3>
                        <p className="text-[13px] text-muted-foreground leading-relaxed line-clamp-2">
                            {agent.description || "Нажмите, чтобы начать диалог"}
                        </p>
                    </div>

                    <div className="absolute top-5 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <ArrowRight className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                    </div>
                </div>
            ))}
        </div>
    )
}
