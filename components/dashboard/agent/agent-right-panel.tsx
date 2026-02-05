"use client"

import React, { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Agent, AgentFile } from "@prisma/client"
import { updateAgentSettings, updateAgentDataset } from "@/actions/agents"
import { getDatasets, getDataset } from "@/actions/datasets"
import { Settings } from "lucide-react"
import { EditAgentDialog } from "@/components/dashboard/edit-agent-dialog"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { AgentDatasetSelector } from "./right-panel/agent-dataset-selector"
import { AgentGenerationSettings } from "./right-panel/agent-generation-settings"
import { AgentFilePreview } from "./right-panel/agent-file-preview"

interface AgentRightPanelProps {
    agent: Agent & { files?: AgentFile[] }
}

export function AgentRightPanel({ agent }: AgentRightPanelProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [previewFile, setPreviewFile] = useState<AgentFile | null>(null)

    // Settings state
    const [useEmoji, setUseEmoji] = useState(agent.useEmoji || false)
    const [useSubscribe, setUseSubscribe] = useState(agent.useSubscribe || false)
    const [useLinkInBio, setUseLinkInBio] = useState(agent.useLinkInBio || false)
    const [codeWord, setCodeWord] = useState(agent.codeWord || "")
    const [audienceQuestion, setAudienceQuestion] = useState(agent.audienceQuestion || "")

    const [subscribeLink, setSubscribeLink] = useState((agent as any).subscribeLink || "")

    // Dataset info for Headlines agent
    const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>((agent as any).datasetId || null)
    const [datasets, setDatasets] = useState<{ id: string, name: string }[]>([])
    const [datasetName, setDatasetName] = useState<string>("")

    React.useEffect(() => {
        // Fetch all datasets
        getDatasets().then(ds => setDatasets(ds))
        // Fetch current dataset name
        if (selectedDatasetId) {
            getDataset(selectedDatasetId).then(ds => {
                if (ds) setDatasetName(ds.name)
            })
        }
    }, [selectedDatasetId])

    const handleDatasetChange = (value: string) => {
        const newId = value === "none" ? null : value
        setSelectedDatasetId(newId)
        startTransition(async () => {
            try {
                await updateAgentDataset(agent.id, newId)
                toast.success(newId ? "Датасет выбран" : "Датасет сброшен")
                router.refresh()
            } catch (error) {
                toast.error("Ошибка сохранения")
            }
        })
    }

    // Check agent types
    const isDescriptionAgent = agent.name.toLowerCase().includes("описание") || agent.name.toLowerCase().includes("description")
    const isHeadlinesAgent = agent.name.toLowerCase().includes("заголовки") || agent.name.toLowerCase().includes("headlines")
    const isStructureAgent = agent.name.toLowerCase().includes("структура")

    // Описание and Структура agents should have border
    const shouldShowBorder = isDescriptionAgent || isStructureAgent

    const saveSettings = (updates: Partial<{
        useEmoji: boolean
        useSubscribe: boolean
        useLinkInBio: boolean
        codeWord: string
        audienceQuestion: string
        subscribeLink: string
    }>) => {
        startTransition(async () => {
            try {
                await updateAgentSettings(agent.id, updates)
                // Refresh to sync systemPrompt changes
                router.refresh()
            } catch (error) {
                toast.error("Ошибка сохранения настроек")
            }
        })
    }




    const handleFilePreviewClose = (open: boolean) => {
        if (!open) setPreviewFile(null)
    }

    const handleSettingsChange = (updates: Partial<any>) => {
        // Update local state
        if ('useEmoji' in updates) setUseEmoji(updates.useEmoji)
        if ('useSubscribe' in updates) setUseSubscribe(updates.useSubscribe)
        if ('useLinkInBio' in updates) setUseLinkInBio(updates.useLinkInBio)
        if ('codeWord' in updates) setCodeWord(updates.codeWord)
        if ('audienceQuestion' in updates) setAudienceQuestion(updates.audienceQuestion)
        if ('subscribeLink' in updates) setSubscribeLink(updates.subscribeLink)
    }

    // Consolidated settings object
    const currentSettings = {
        useEmoji,
        useSubscribe,
        useLinkInBio,
        codeWord,
        audienceQuestion,
        subscribeLink
    }

    return (
        <>
            <div className={cn(
                "w-[280px] shrink-0 p-5 flex flex-col gap-6 h-fit ml-6 mt-10",
                shouldShowBorder && "border border-border/50 rounded-xl"
            )}>

                {/* Settings Header for Headlines agents */}
                {isHeadlinesAgent && !isDescriptionAgent && (
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-foreground">Настройки</h3>
                        <div className="flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                            <span className="text-xs text-muted-foreground">Обновляется автоматически</span>
                        </div>
                    </div>
                )}

                {/* "Invested" Badge (High Value) - Minimalist Style */}
                {isDescriptionAgent && (
                    <div className="text-xs text-muted-foreground flex items-center gap-2 justify-center">
                        <span>💎</span>
                        <span>В меня вложили уже много</span>
                    </div>
                )}

                {/* Instructions Section - Hide for Headlines agent (per task 3.1) */}
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

                {/* Chat Settings (only for Description agent) */}
                {isDescriptionAgent && (
                    <AgentGenerationSettings
                        settings={currentSettings}
                        onSettingChange={handleSettingsChange}
                        onSave={saveSettings}
                    />
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
