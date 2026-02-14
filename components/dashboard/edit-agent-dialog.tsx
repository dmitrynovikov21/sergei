"use client"

import React, { useState, useTransition, useRef } from "react"
import { useRouter } from "next/navigation"
import { Agent, AgentFile } from "@prisma/client"
import { updateAgentPrompt, addAgentFile, deleteAgentFile, updateAgentSettings, updateAgentDataset } from "@/actions/agents"
import { getDatasets } from "@/actions/datasets" // Для выбора датасета
import { Button } from "@/components/ui/button"
import {
    Dialog as UIDialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog"
import { Icons } from "@/components/shared/icons"
import { toast } from "sonner"
import { Settings, AlertTriangle } from "lucide-react"
import { AgentGeneralSettings } from "./edit-agent/agent-general-settings"
import { AgentDescriptionSettings } from "./edit-agent/agent-description-settings"
import { AgentFilesManager } from "./edit-agent/agent-files-manager"
import { updateSystemPrompt } from "@/lib/agent-prompt-utils"


interface EditAgentDialogProps {
    agent: Agent & { files?: AgentFile[] }
    trigger?: React.ReactNode
}

export function EditAgentDialog({ agent, trigger }: EditAgentDialogProps) {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [isPending, startTransition] = useTransition()
    const [isLoading, setIsLoading] = useState(false)
    const [systemPrompt, setSystemPrompt] = useState(agent.systemPrompt)
    const [agentName, setAgentName] = useState(agent.name)
    const [savedPrompt, setSavedPrompt] = useState(agent.systemPrompt)
    const [files, setFiles] = useState<AgentFile[]>(agent.files || [])
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [previewFile, setPreviewFile] = useState<AgentFile | null>(null)

    // Dataset logic
    const [datasets, setDatasets] = useState<{ id: string, name: string }[]>([])
    const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>((agent as any).datasetId || null)

    // Helper functions for file type detection
    const isImageFile = (filename: string) => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(filename)
    const isPdfFile = (filename: string) => /\.pdf$/i.test(filename)
    const isTextFile = (filename: string) => /\.(txt|md|json|csv|xml)$/i.test(filename)

    // Settings for Description agent
    const [useEmoji, setUseEmoji] = useState(agent.useEmoji || false)
    const [useSubscribe, setUseSubscribe] = useState(agent.useSubscribe || false)
    const [useLinkInBio, setUseLinkInBio] = useState(agent.useLinkInBio || false)
    // Alias for compatibility with my previous code
    const useTgLink = useLinkInBio
    const setUseTgLink = setUseLinkInBio

    const [codeWord, setCodeWord] = useState(agent.codeWord || "")
    const [useCodeWord, setUseCodeWord] = useState(!!agent.codeWord) // Toggle state

    const [audienceQuestion, setAudienceQuestion] = useState(agent.audienceQuestion || "Какая у вас ниша?")
    const [useAudienceQuestion, setUseAudienceQuestion] = useState(!!agent.audienceQuestion) // Toggle state

    const [subscribeLink, setSubscribeLink] = useState((agent as any).subscribeLink || "")

    // Check if this agent should show description settings (only for specific system agents)
    const agentNameLower = agent.name.toLowerCase()
    const isDescriptionAgent =
        agentNameLower.includes("описание") && agentNameLower.includes("reels") // Описание Reels
    const isStructureAgent =
        agentNameLower.includes("структура") && agentNameLower.includes("карусел") // Структура Карусели
    const showDescriptionSettings = isDescriptionAgent || isStructureAgent

    // Limits removed as per request

    // Fetch fresh data when dialog opens
    const fetchFreshData = async () => {
        setIsLoading(true)
        try {
            const response = await fetch(`/api/agents/${agent.id}`)
            if (response.ok) {
                const freshAgent = await response.json()
                setSystemPrompt(freshAgent.systemPrompt)
                setSavedPrompt(freshAgent.systemPrompt)
                setFiles(freshAgent.files || [])
                // Update settings
                setUseEmoji(freshAgent.useEmoji || false)
                setUseSubscribe(freshAgent.useSubscribe || false)
                setUseLinkInBio(freshAgent.useLinkInBio || false)

                setCodeWord(freshAgent.codeWord || "")
                setUseCodeWord(!!freshAgent.codeWord)

                setAudienceQuestion(freshAgent.audienceQuestion || "")
                setUseAudienceQuestion(!!freshAgent.audienceQuestion)

                setSubscribeLink(freshAgent.subscribeLink || "")
                setSelectedDatasetId((freshAgent as any).datasetId || null)
            }

            // Fetch Datasets
            const dbDatasets = await getDatasets()
            setDatasets(dbDatasets)

        } catch (error) {
            console.error("Failed to fetch data:", error)
        }
        setIsLoading(false)
    }

    // Fetch fresh data when dialog opens
    React.useEffect(() => {
        if (open) {
            fetchFreshData()
        }
    }, [open])

    // Auto-update prompt when settings change (only for description/structure agents)
    const isFirstRender = useRef(true)

    React.useEffect(() => {
        if (!showDescriptionSettings) return

        // Skip first render to avoid overwriting initial fetch
        if (isFirstRender.current) {
            isFirstRender.current = false
            return
        }

        const newPrompt = updateSystemPrompt(systemPrompt, {
            useEmoji,
            useSubscribe,
            useLinkInBio,
            subscribeLink,
            codeWord: useCodeWord ? codeWord : "",
            audienceQuestion, // Pass raw text
            useAudienceQuestion // Pass toggle state
        })

        if (newPrompt !== systemPrompt) {
            setSystemPrompt(newPrompt)
        }
    }, [
        useEmoji,
        useSubscribe,
        useLinkInBio,
        subscribeLink,
        codeWord,
        useCodeWord,
        audienceQuestion,
        useAudienceQuestion,
        showDescriptionSettings
    ])

    // Main Save Handler (Single Button)
    const handleSaveAll = () => {
        startTransition(async () => {
            try {
                // 1. Update Settings
                await updateAgentSettings(agent.id, {
                    name: agentName,
                    useEmoji,
                    useSubscribe,
                    useLinkInBio,
                    codeWord: useCodeWord ? codeWord : "",
                    audienceQuestion: useAudienceQuestion ? audienceQuestion : "",
                    subscribeLink
                } as any)

                // 2. Update Dataset (if description agent)
                if (isDescriptionAgent) {
                    await updateAgentDataset(agent.id, selectedDatasetId)
                }

                // 3. Update Prompt
                await updateAgentPrompt(agent.id, systemPrompt)

                setSavedPrompt(systemPrompt)
                toast.success("Все настройки сохранены")
                setOpen(false)
                router.refresh()
            } catch (error) {
                toast.error("Ошибка сохранения")
            }
        })
    }

    // Helper to update prompt locally based on settings logic (moved from switches)
    // NOTE: In the original code, the prompt update logic was complex inside switches.
    // Ideally we should preserve that logic, but now update local state `systemPrompt` instead of calling server immediately.
    // HOWEVER, the previous implementation updated BOTH `systemPrompt` state AND called server.
    // We will keep the logic inside switches but REMOVE the explicit server calls, just update state.
    // Wait, the switches in the UI section below need to be updated to NOT call saveSetting/updateAgentPrompt.

    // Removed handleSavePrompt and saveSetting as they are replaced by handleSaveAll




    const handleFileUpload = async (file: File) => {
        if (!file) return

        // Check file size - increased to 10MB
        const maxSize = 10 * 1024 * 1024 // 10MB for all files
        if (file.size > maxSize) {
            toast.error(`Файл слишком большой. Максимум: 10MB`)
            return
        }

        const isBinaryFile = file.type.startsWith('image/') || file.type === 'application/pdf'
        const reader = new FileReader()

        reader.onload = async (event) => {
            const content = event.target?.result as string

            startTransition(async () => {
                try {
                    const newFile = await addAgentFile(agent.id, file.name, content, file.type)
                    setFiles((prev) => [newFile, ...prev])
                    toast.success("Файл добавлен")
                    // Don't call router.refresh() here - it resets local state
                } catch (error) {
                    console.error("File upload error:", error)
                    toast.error("Ошибка загрузки файла")
                }
            })
        }

        reader.onerror = () => {
            toast.error("Ошибка чтения файла")
        }

        if (isBinaryFile) {
            reader.readAsDataURL(file)
        } else {
            reader.readAsText(file)
        }
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const fileList = e.target.files
        if (fileList) {
            Array.from(fileList).forEach(file => handleFileUpload(file))
        }
        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = ""
        }
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(true)
    }

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        const file = e.dataTransfer.files?.[0]
        if (file) {
            handleFileUpload(file)
        }
    }

    const handleDeleteFile = (fileId: string) => {
        startTransition(async () => {
            try {
                await deleteAgentFile(fileId)
                setFiles((prev) => prev.filter((f) => f.id !== fileId))
                toast.success("Файл удален")
                router.refresh()
            } catch (error) {
                toast.error("Ошибка удаления файла")
            }
        })
    }

    return (
        <UIDialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Settings className="h-4 w-4" />
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-0 gap-0 border-zinc-200 dark:border-zinc-700">
                {/* Safety Banner */}
                {showDescriptionSettings && (
                    <div className="border-b border-zinc-200 dark:border-zinc-700 p-3 flex items-center justify-center text-center gap-2 text-zinc-500 dark:text-zinc-400 text-sm">
                        <span>В меня вложили уже много сил и времени, пожалуйста не сломай меня! 🥺</span>
                    </div>
                )}

                {/* Header */}
                <DialogHeader className="p-6 pb-4 border-b border-zinc-100 dark:border-zinc-800">
                    <DialogTitle className="flex items-center gap-3 text-xl">
                        Настройки агента
                    </DialogTitle>
                    <DialogDescription className="text-zinc-500">
                        {agentName}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-0 divide-y divide-zinc-100 dark:divide-zinc-800">
                    {/* 1. General Settings */}
                    <AgentGeneralSettings
                        name={agentName}
                        setName={setAgentName}
                        systemPrompt={systemPrompt}
                        setSystemPrompt={setSystemPrompt}
                    />

                    {/* 2. Description Settings (Conditional) */}
                    {showDescriptionSettings && (
                        <AgentDescriptionSettings
                            useEmoji={useEmoji}
                            setUseEmoji={setUseEmoji}
                            useSubscribe={useSubscribe}
                            setUseSubscribe={setUseSubscribe}
                            useLinkInBio={useLinkInBio}
                            setUseLinkInBio={setUseLinkInBio}
                            subscribeLink={subscribeLink}
                            setSubscribeLink={setSubscribeLink}
                            codeWord={codeWord}
                            setCodeWord={setCodeWord}
                            useCodeWord={useCodeWord}
                            setUseCodeWord={setUseCodeWord}
                            audienceQuestion={audienceQuestion}
                            setAudienceQuestion={setAudienceQuestion}
                            useAudienceQuestion={useAudienceQuestion}
                            setUseAudienceQuestion={setUseAudienceQuestion}
                            selectedDatasetId={selectedDatasetId}
                            setSelectedDatasetId={setSelectedDatasetId}
                            datasets={datasets}
                        />
                    )}

                    {/* 3. Files Manager */}
                    <AgentFilesManager
                        agentId={agent.id}
                        files={files}
                        setFiles={setFiles}
                        isPending={isPending}
                        startTransition={startTransition}
                        refreshRouter={() => router.refresh()}
                    />
                </div>

                {/* Footer */}
                <DialogFooter className="p-6 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                    <Button
                        onClick={handleSaveAll}
                        className="rounded-lg bg-foreground text-background hover:bg-foreground/90 w-full"
                        disabled={isPending}
                    >
                        {isPending && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                        Сохранить настройки
                    </Button>
                </DialogFooter>
            </DialogContent>
        </UIDialog>
    )
}
