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

    // Map agent names to display names (only first word capitalized)
    const getDisplayName = (name: string) => {
        const n = name.toLowerCase()
        if (n.includes("заголовки reels")) return "Сделать заголовки"
        if (n.includes("описание reels")) return "Придумать описания"
        if (n.includes("заголовки каруселей")) return "Сделать заголовки"
        if (n.includes("структура карусел")) return "Придумать структуру"
        return name
    }
    const displayName = getDisplayName(agent.name)

    const handleDelete = () => {
        startTransition(async () => {
            try {
                const result = await deleteAgent(agent.id)

                if (result.success) {
                    toast.success("Агент удалён")
                    if (isAgentPage) {
                        router.push("/dashboard/agents")
                    }
                    router.refresh()
                } else {
                    toast.error(result.error || "Ошибка удаления")
                }
            } catch (error) {
                console.error("Delete error:", error)
                toast.error("Непредвиденная ошибка")
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
                            "flex items-center gap-2 px-2 py-1 text-[15px] transition-all duration-200 rounded-md mb-1",
                            isAgentPage
                                ? "text-foreground font-medium bg-muted"
                                : "text-muted-foreground hover:text-white hover:bg-[#141413]/95",
                            canDelete && isExpanded && "pr-7"
                        )}
                    >
                        <span className="truncate">{displayName}</span>
                    </Link>
                </TooltipTrigger>
                {!isExpanded && <TooltipContent side="right" className="bg-card text-foreground border-border text-xs">{agent.name}</TooltipContent>}
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
