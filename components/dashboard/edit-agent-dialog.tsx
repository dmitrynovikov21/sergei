"use client"

import React, { useState, useTransition, useRef } from "react"
import { useRouter } from "next/navigation"
import { Agent, AgentFile } from "@prisma/client"
import { updateAgentPrompt, addAgentFile, deleteAgentFile, updateAgentSettings, updateAgentDataset } from "@/actions/agents"
import { getDatasets } from "@/actions/datasets" // Для выбора датасета
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog"
import { Icons } from "@/components/shared/icons"
import { toast } from "sonner"
import { Trash2, Upload, FileText, Settings, Eye, Image as ImageIcon, X, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Icons } from "@/components/shared/icons"

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

    const [audienceQuestion, setAudienceQuestion] = useState(agent.audienceQuestion || "")
    const [useAudienceQuestion, setUseAudienceQuestion] = useState(!!agent.audienceQuestion) // Toggle state

    const [subscribeLink, setSubscribeLink] = useState((agent as any).subscribeLink || "")

    // Check if this is Description agent
    const isDescriptionAgent = agent.name.toLowerCase().includes("описание") || agent.name.toLowerCase().includes("description")

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
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Settings className="h-4 w-4" />
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-0 gap-0 border-zinc-200 dark:border-zinc-700">
                {/* Safety Banner */}
                {isDescriptionAgent && (
                    <div className="bg-amber-100 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-800 p-3 flex items-center justify-center text-center gap-2 text-amber-800 dark:text-amber-200 text-sm font-medium">
                        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                        <span>В меня вложили уже много сил и времени, пожалуйста не сломай меня! 🥺</span>
                    </div>
                )}

                {/* Header */}
                <DialogHeader className="p-6 pb-4 border-b border-zinc-100 dark:border-zinc-800">
                    <DialogTitle className="flex items-center gap-3 text-xl">
                        <span className="text-2xl">{agent.emoji || "🤖"}</span>
                        <input
                            type="text"
                            value={agentName}
                            onChange={(e) => setAgentName(e.target.value)}
                            // Removed onBlur autosave
                            className="bg-transparent border-none outline-none text-xl font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800 px-2 py-1 rounded-lg transition-colors focus:bg-zinc-100 dark:focus:bg-zinc-800"
                        />
                    </DialogTitle>
                    <DialogDescription className="text-zinc-500">
                        Настройки агента и системный промпт
                    </DialogDescription>
                </DialogHeader>

                <div className="p-6 space-y-8">
                    {/* System Prompt */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <Label htmlFor="systemPrompt" className="text-sm font-medium">
                                Системный промпт (инструкции)
                            </Label>
                            <Textarea
                                id="systemPrompt"
                                value={systemPrompt}
                                onChange={(e) => setSystemPrompt(e.target.value)}
                                placeholder="Опишите поведение и роль AI агента..."
                                className="min-h-[400px] font-mono text-sm bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 rounded-xl resize-y"
                            />
                            {/* Removed local Save Prompt button */}
                        </div>

                        {/* Description Agent Settings */}
                        {isDescriptionAgent && (
                            <div className="space-y-5 p-5 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl">
                                <Label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                                    Настройки описаний
                                </Label>

                                <div className="space-y-6">
                                    {/* 1. Emoji */}
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="edit-emoji" className="text-base font-medium">Эмоджи</Label>
                                        <Switch
                                            id="edit-emoji"
                                            className="data-[state=checked]:bg-green-500 will-change-transform"
                                            checked={useEmoji}
                                            onCheckedChange={(checked) => {
                                                setUseEmoji(checked)
                                                // Local update only
                                                if (checked) {
                                                    const hasMainHeader = newPrompt.includes(TARGET_MAIN_HEADER)
                                                    const headerBlock = hasMainHeader ? "" : `\n\n${TARGET_MAIN_HEADER}`
                                                    const CLEAN_BLOCK = `${headerBlock}\n\n${TARGET_SUBHEADER}\n${TARGET_BODY}`
                                                    newPrompt = newPrompt + CLEAN_BLOCK
                                                }
                                                setSystemPrompt(newPrompt)
                                            }}
                                        />
                                    </div>

                                    {/* 2. Subscribe */}
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="edit-subscribe" className="text-base font-medium">Призыв подписаться</Label>
                                        <Switch
                                            id="edit-subscribe"
                                            className="data-[state=checked]:bg-green-500 will-change-transform"
                                            checked={useSubscribe}
                                            onCheckedChange={(checked) => {
                                                setUseSubscribe(checked)
                                                // Local update
                                                if (checked) {
                                                    const CLEAN_BLOCK = `\n\n${TARGET_SUBHEADER}\n${TARGET_BODY}`
                                                    newPrompt = newPrompt + CLEAN_BLOCK
                                                }
                                                setSystemPrompt(newPrompt)
                                            }}
                                        />
                                    </div>

                                    {/* Subscribe Link Input */}
                                    {useSubscribe && (
                                        <div className="pl-0 animate-in fade-in slide-in-from-top-2 duration-200">
                                            <Label htmlFor="subscribe-link" className="text-sm text-muted-foreground mb-2 block">
                                                Ссылка для подписки
                                            </Label>
                                            <Input
                                                id="subscribe-link"
                                                value={subscribeLink}
                                                onChange={(e) => setSubscribeLink(e.target.value)}
                                                onBlur={() => {
                                                    // Update prompt immediately when link changes
                                                    // Update prompt immediately when link changes
                                                }
                                                }}
                                            placeholder="https://instagram.com/..."
                                            className="bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 focus-visible:ring-zinc-400"
                                        />
                                        </div>
                                    )}

                                    {/* 3. Telegram Link */}
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="edit-tg" className="text-base font-medium">Призыв на ТГ в шапке профиля</Label>
                                        <Switch
                                            id="edit-tg"
                                            className="data-[state=checked]:bg-green-500 will-change-transform"
                                            checked={useLinkInBio}
                                            onCheckedChange={(checked) => {
                                                setUseLinkInBio(checked)
                                                // Local update
                                                if (checked) {
                                                    const CLEAN_BLOCK = `\n\n${TARGET_SUBHEADER}\n${TARGET_BODY}`
                                                    newPrompt = newPrompt + CLEAN_BLOCK
                                                }
                                                setSystemPrompt(newPrompt)
                                            }}
                                        />
                                    </div>

                                    {/* 4. Code Word */}
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="edit-codeword" className="text-base font-medium">Кодовое слово</Label>
                                        <Switch
                                            id="edit-codeword"
                                            className="data-[state=checked]:bg-green-500 will-change-transform"
                                            checked={!!codeWord}
                                            onCheckedChange={(checked) => {
                                                // CodeWord Logic
                                                let currentWord = ""
                                                if (!checked) {
                                                    setCodeWord("")
                                                    // Local update
                                                    if (checked) {
                                                        const CLEAN_BLOCK = `\n\n${TARGET_SUBHEADER}\n${TARGET_BODY}`
                                                        newPrompt = newPrompt + CLEAN_BLOCK
                                                    }
                                                    setSystemPrompt(newPrompt)
                                                }
                                            }
                                    />
                                    </div>

                                    {!!codeWord && (
                                        <div className="pl-0 animate-in fade-in slide-in-from-top-2 duration-200">
                                            <Label htmlFor="code-word-input" className="text-sm text-muted-foreground mb-2 block">
                                                Слово
                                            </Label>
                                            <Input
                                                id="code-word-input"
                                                value={codeWord}
                                                onChange={(e) => setCodeWord(e.target.value)}
                                                onBlur={() => {
                                                    if (!!codeWord) {
                                                    }
                                                }}
                                                placeholder="СТАРТ"
                                                className="bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 focus-visible:ring-zinc-400"
                                            />
                                        </div>
                                    )}


                                    {/* 5. Audience Question */}
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="edit-question" className="text-base font-medium">Вопрос аудитории</Label>
                                        <Switch
                                            id="edit-question"
                                            className="data-[state=checked]:bg-green-500 will-change-transform"
                                            checked={useAudienceQuestion}
                                            onCheckedChange={(checked) => {
                                                setUseAudienceQuestion(checked)
                                                // Local update
                                                if (checked) {
                                                    const CLEAN_BLOCK = `\n\n${TARGET_SUBHEADER}\n${TARGET_BODY}`
                                                    newPrompt = newPrompt + CLEAN_BLOCK
                                                }
                                                setSystemPrompt(newPrompt)
                                            }}
                                        />
                                    </div>
                                    />
                                </div>

                                {/* 6. Dataset Selection */}
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="edit-dataset" className="text-base font-medium">Датасет (контекст)</Label>
                                    <Select
                                        value={selectedDatasetId || "none"}
                                        onValueChange={(value) => setSelectedDatasetId(value === "none" ? null : value)}
                                    >
                                        <SelectTrigger className="w-[180px]">
                                            <SelectValue placeholder="Без контекста" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">Без контекста</SelectItem>
                                            {datasets.map(ds => (
                                                <SelectItem key={ds.id} value={ds.id}>{ds.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Files Section */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">Файлы контекста</Label>
                            <div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    multiple
                                    accept=".txt,.md,.json,.csv,.xml,.pdf,.jpg,.jpeg,.png"
                                    onChange={handleInputChange}
                                    className="hidden"
                                />
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isPending}
                                    className="rounded-lg"
                                >
                                    <Upload className="mr-2 h-4 w-4" />
                                    Загрузить
                                </Button>
                            </div>
                        </div>

                        <p className="text-xs text-zinc-500">
                            Перетащите файл или нажмите "Загрузить"
                        </p>

                    </p>
                </div>
                        ) : null }

                {/* Always show file list if files exist, DO NOT hide dropzone (User Request) 
                            Actually user complained "only one file added and field disappeared". 
                            This was because of `files.length === 0 ? (...) : (...)` logic.
                            I will show Dropzone ALWAYS, and file list below it.
                        */}
                <div className="space-y-2 pt-2">
                    {files.map((file) => (
                        <div
                            key={file.id}
                            className="flex items-center justify-between rounded-xl bg-zinc-50 dark:bg-zinc-800 p-3"
                        >
                            <div className="flex items-center gap-3">
                                {isImageFile(file.name) ? (
                                    <ImageIcon className="h-4 w-4 text-zinc-400" />
                                ) : (
                                    <FileText className="h-4 w-4 text-zinc-400" />
                                )}
                                <span className="text-sm font-medium">{file.name}</span>
                                <span className="text-xs text-zinc-400">
                                    {file.content.length > 1000
                                        ? `${Math.round(file.content.length / 1024)}KB`
                                        : `${file.content.length} симв.`}
                                </span>
                            </div>
                            <div className="flex gap-1">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-zinc-500 hover:text-zinc-700"
                                    onClick={() => {
                                        if (isImageFile(file.name) || isPdfFile(file.name)) {
                                            try {
                                                const isDataUrl = file.content.startsWith('data:')
                                                const fetchUrl = isDataUrl ? file.content : `data:${isPdfFile(file.name) ? 'application/pdf' : 'image/png'};base64,${file.content}`

                                                fetch(fetchUrl)
                                                    .then(res => res.blob())
                                                    .then(blob => {
                                                        const url = URL.createObjectURL(blob)
                                                        window.open(url, '_blank')
                                                        setTimeout(() => URL.revokeObjectURL(url), 60000)
                                                    })
                                            } catch (e) {
                                                console.error("Failed to open file", e)
                                                window.open(file.content, '_blank')
                                            }
                                        } else {
                                            setPreviewFile(file)
                                        }
                                    }}
                                >
                                    <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                    onClick={() => handleDeleteFile(file.id)}
                                    disabled={isPending}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>

                    {/* File Preview Modal (for text files only) */ }
    {
        previewFile && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" onClick={() => setPreviewFile(null)}>
                <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-3xl max-h-[80vh] w-full mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-700">
                        <h3 className="font-semibold">{previewFile.name}</h3>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setPreviewFile(null)}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                    <div className="p-4 overflow-auto max-h-[calc(80vh-80px)]">
                        <pre className="whitespace-pre-wrap text-sm font-mono bg-zinc-50 dark:bg-zinc-800 p-4 rounded-lg overflow-auto">
                            {previewFile.content}
                        </pre>
                    </div>
                </div>
            </div>
        )
    }
                </div >

        {/* Footer */ }
        < DialogFooter className = "p-6 pt-4 border-t border-zinc-100 dark:border-zinc-800" >
            <Button
                onClick={handleSaveAll}
                className="rounded-lg bg-zinc-900 text-white hover:bg-black w-full"
                disabled={isPending}
            >
                {isPending && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                Сохранить настройки
            </Button>
                </DialogFooter >
            </DialogContent >
        </Dialog >
    )
}
