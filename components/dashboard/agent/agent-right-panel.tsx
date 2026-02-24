"use client"

import React, { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Agent, AgentFile } from "@prisma/client"
import { updateAgentPrompt } from "@/actions/agents"
import { Settings } from "lucide-react"
import { EditAgentDialog } from "@/components/dashboard/edit-agent-dialog"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { AgentGenerationSettings } from "./right-panel/agent-generation-settings"
import { AgentFilePreview } from "./right-panel/agent-file-preview"

interface AgentRightPanelProps {
    agent: Agent & { files?: AgentFile[] }
}

export function AgentRightPanel({ agent }: AgentRightPanelProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [previewFile, setPreviewFile] = useState<AgentFile | null>(null)
    const [systemPrompt, setSystemPrompt] = useState(agent.systemPrompt)

    // Sync when agent prop changes (after dialog save + router.refresh)
    React.useEffect(() => {
        setSystemPrompt(agent.systemPrompt)
    }, [agent.systemPrompt])

    // Check agent types
    const isDescriptionAgent = agent.name.toLowerCase().includes("описание") || agent.name.toLowerCase().includes("description")
    const isHeadlinesAgent = agent.name.toLowerCase().includes("заголовки") || agent.name.toLowerCase().includes("headlines")

    // When toggle changes prompt, save it immediately
    const handlePromptChange = (newPrompt: string) => {
        setSystemPrompt(newPrompt)
        // Auto-save to DB
        startTransition(async () => {
            try {
                await updateAgentPrompt(agent.id, newPrompt)
                router.refresh()
            } catch (error) {
                toast.error("Ошибка сохранения")
            }
        })
    }

    const handleFilePreviewClose = (open: boolean) => {
        if (!open) setPreviewFile(null)
    }

    return (
        <>
            <div className={cn(
                "w-[280px] shrink-0 p-5 flex flex-col gap-6 h-fit ml-6 mt-10",
                "border border-border/50 rounded-xl"
            )}>

                {/* "Invested" Badge */}
                {isDescriptionAgent && (
                    <div className="text-xs text-muted-foreground flex items-center gap-2 justify-center">
                        <span>💎</span>
                        <span>В меня вложили уже много</span>
                    </div>
                )}

                {/* Instructions Section */}
                {!isHeadlinesAgent && (
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold text-muted-foreground">Инструкции</h3>
                            <EditAgentDialog
                                agent={agent}
                                trigger={
                                    <Button variant="ghost" size="icon" className="h-7 w-7 border border-border/50 hover:bg-muted">
                                        <Settings className="h-4 w-4 text-muted-foreground" />
                                    </Button>
                                }
                            />
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            {agent.systemPrompt
                                ? `${agent.systemPrompt.slice(0, 100)}...`
                                : "Добавьте инструкции для настройки ответов Claude"}
                        </p>
                    </div>
                )}

                {/* Settings toggles — read/write from systemPrompt markers */}
                {isDescriptionAgent && (
                    <AgentGenerationSettings
                        systemPrompt={systemPrompt}
                        onPromptChange={handlePromptChange}
                    />
                )}

                {/* Headlines agent header */}
                {isHeadlinesAgent && !isDescriptionAgent && (
                    <div className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        <span className="text-xs text-muted-foreground">Обновляется автоматически</span>
                    </div>
                )}

            </div>

            {/* File Preview Dialog */}
            <AgentFilePreview
                file={previewFile}
                open={!!previewFile}
                onOpenChange={handleFilePreviewClose}
            />
        </>
    )
}
