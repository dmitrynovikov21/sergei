"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Agent } from "@prisma/client"
import { cn } from "@/lib/utils"
import { Trash2 } from "lucide-react"
import { deleteAgent } from "@/actions/agents"
import { toast } from "sonner"
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface AgentLinkProps {
    agent: Agent;
    path: string;
    isExpanded: boolean;
    canDelete?: boolean;
}

export function SidebarAgentLink({ agent, path, isExpanded, canDelete = false }: AgentLinkProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [isHovered, setIsHovered] = useState(false)
    const isAgentPage = path === `/dashboard/agents/${agent.id}`;

    const handleDelete = () => {
        startTransition(async () => {
            try {
                await deleteAgent(agent.id)
                toast.success("Агент удалён")
                router.push("/dashboard/agents")
                router.refresh()
            } catch (error) {
                toast.error("Ошибка удаления агента")
            }
        })
    }

    return (
        <div
            className="relative group"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <Tooltip>
                <TooltipTrigger asChild>
                    <Link
                        href={`/dashboard/agents/${agent.id}`}
                        className={cn(
                            "flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors",
                            isAgentPage
                                ? "bg-zinc-200/50 dark:bg-zinc-800 text-zinc-900 dark:text-white font-medium shadow-sm"
                                : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-200",
                            canDelete && isExpanded && "pr-8"
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

            {/* Delete button - only for user agents */}
            {canDelete && isExpanded && isHovered && (
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <button
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Удалить агента?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Агент "{agent.name}" будет удалён безвозвратно. Все чаты с этим агентом также будут удалены.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Отмена</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleDelete}
                                className="bg-red-500 hover:bg-red-600"
                                disabled={isPending}
                            >
                                {isPending ? "Удаление..." : "Удалить"}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </div>
    )
}
