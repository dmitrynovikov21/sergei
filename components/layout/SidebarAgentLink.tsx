
import Link from "next/link"
import { Agent } from "@prisma/client"
import { cn } from "@/lib/utils"
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip"

interface AgentLinkProps {
    agent: Agent;
    path: string;
    isExpanded: boolean;
}

export function SidebarAgentLink({ agent, path, isExpanded }: AgentLinkProps) {
    const isAgentPage = path === `/dashboard/agents/${agent.id}`;
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Link
                    href={`/dashboard/agents/${agent.id}`}
                    className={cn(
                        "flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors group",
                        isAgentPage
                            ? "bg-zinc-200/50 dark:bg-zinc-800 text-zinc-900 dark:text-white font-medium shadow-sm"
                            : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-200"
                    )}
                >
                    <span className={cn("flex items-center justify-center w-5 h-5 shrink-0 text-base leading-none", !isExpanded && "mx-auto")}>
                        {agent.emoji || "🤖"}
                    </span>
                    {isExpanded && (
                        <span className="truncate">{agent.name}</span>
                    )}
                </Link>
            </TooltipTrigger>
            {!isExpanded && <TooltipContent side="right" className="bg-zinc-900 text-white border-zinc-800">{agent.name}</TooltipContent>}
        </Tooltip>
    )
}
