"use client"

import React, { useState, useTransition, useRef } from "react"
import { useRouter } from "next/navigation"
import { Agent, AgentFile } from "@prisma/client"
import { updateAgentPrompt, addAgentFile, deleteAgentFile, updateAgentSettings } from "@/actions/agents"
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
    const [savedPrompt, setSavedPrompt] = useState(agent.systemPrompt)
    const [files, setFiles] = useState<AgentFile[]>(agent.files || [])
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [previewFile, setPreviewFile] = useState<AgentFile | null>(null)

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

    // Limits
    const charCount = systemPrompt.length
    const charLimit = 2200

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
            }
        } catch (error) {
            console.error("Failed to fetch agent data:", error)
        }
        setIsLoading(false)
    }

    // Fetch fresh data when dialog opens
    React.useEffect(() => {
        if (open) {
            fetchFreshData()
        }
    }, [open])

    const handleSavePrompt = () => {
        startTransition(async () => {
            try {
                await updateAgentPrompt(agent.id, systemPrompt)
                setSavedPrompt(systemPrompt)
                toast.success("Инструкции обновлены")
            } catch (error) {
                toast.error("Ошибка сохранения")
            }
        })
    }

    // Auto-save individual setting when changed and refetch to update textarea
    const saveSetting = async (key: string, value: boolean | string) => {
        startTransition(async () => {
            try {
                await updateAgentSettings(agent.id, { [key]: value })
                // Refetch to get updated systemPrompt
                await fetchFreshData()
            } catch (error) {
                toast.error("Ошибка сохранения")
            }
        })
    }



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
        const file = e.target.files?.[0]
        if (file) {
            handleFileUpload(file)
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
                    <div className="bg-amber-100 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-800 p-3 flex items-center justify-center gap-2 text-amber-800 dark:text-amber-200 text-sm font-medium">
                        <AlertTriangle className="h-4 w-4" />
                        <span>В меня вложили уже много сил и времени, пожалуйста не сломай меня! 🥺</span>
                    </div>
                )}

                {/* Header */}
                <DialogHeader className="p-6 pb-4 border-b border-zinc-100 dark:border-zinc-800">
                    <DialogTitle className="flex items-center gap-3 text-xl">
                        <span className="text-2xl">{agent.emoji || "🤖"}</span>
                        {agent.name}
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
                            {isDescriptionAgent && (
                                <span className={cn("text-xs font-mono", charCount > charLimit ? "text-red-500 font-bold" : "text-emerald-500")}>
                                    {charCount} / {charLimit}
                                </span>
                            )}
                        </div>
                        <Textarea
                            id="systemPrompt"
                            value={systemPrompt}
                            onChange={(e) => setSystemPrompt(e.target.value)}
                            placeholder="Опишите поведение и роль AI агента..."
                            className={cn(
                                "min-h-[180px] font-mono text-sm bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 rounded-xl resize-none",
                                isDescriptionAgent && charCount > charLimit && "border-red-500 focus-visible:ring-red-500"
                            )}
                        />
                        <Button
                            onClick={handleSavePrompt}
                            disabled={isPending || systemPrompt === savedPrompt}
                            size="sm"
                            className="rounded-lg"
                        >
                            {isPending ? (
                                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                            ) : null}
                            Сохранить промпт
                        </Button>
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
                                            saveSetting("useEmoji", checked)

                                            const TARGET_SUBHEADER = "ЭМОДЗИ:"
                                            const TARGET_BODY = "Добавляй в текст эмоджи, где это уместно, но без фанатизма. Например вместо пунктов в тексте, можно сделать соответствующие эмодзи, но если подразумевается нумерованный список, то сделай цифры, а не эмодзи."
                                            const TARGET_MAIN_HEADER = "НАСТРОЙКИ ОПИСАНИЯ"

                                            // Robust Cleanup
                                            let newPrompt = systemPrompt || ""
                                            const escapeRegExp = (string: string) => string.replace(/[.*+?^${ }()|[\]\\]/g, '\\$&');

                                            // Headers Lookahead Pattern
                                            const HEADERS_LOOKAHEAD = "(?=ЭМОДЗИ:|ПРИЗЫВ ПОДПИСАТЬСЯ:|ПРИЗЫВ НА ТГ КАНАЛ:|КОДОВОЕ СЛОВО:|ВОПРОС АУДИТОРИИ:|!!!|$)"

                                            // 1. Remove Section (Subheader + content until next header)
                                            const sectionRegex = new RegExp(`(${escapeRegExp(TARGET_SUBHEADER)})([\\s\\S]*?)${HEADERS_LOOKAHEAD}`, 'i')
                                            newPrompt = newPrompt.replace(sectionRegex, "")

                                            // 2. Remove Main Header if it matches exactly (optional cleanup)
                                            // newPrompt = newPrompt.replace("НАСТРОЙКИ ОПИСАНИЯ", "") 

                                            newPrompt = newPrompt.replace(/\n{3,}/g, "\n\n").trim()

                                            // 3. Insert if checked
                                            if (checked) {
                                                // Check if Main Header exists, if not adds it
                                                const hasMainHeader = newPrompt.includes(TARGET_MAIN_HEADER)
                                                const headerBlock = hasMainHeader ? "" : `\n\n${TARGET_MAIN_HEADER}`

                                                const CLEAN_BLOCK = `${headerBlock}\n\n${TARGET_SUBHEADER}\n${TARGET_BODY}`
                                                newPrompt = newPrompt + CLEAN_BLOCK
                                            }

                                            setSystemPrompt(newPrompt)
                                            updateAgentPrompt(agent.id, newPrompt)
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
                                            saveSetting("useSubscribe", checked)

                                            const TARGET_SUBHEADER = "ПРИЗЫВ ПОДПИСАТЬСЯ:"
                                            const TARGET_BODY = `В конце каждого ответа добавляй призыв подписаться на этот аккаунт: ${subscribeLink || "[ССЫЛКА]"}`

                                            let newPrompt = systemPrompt || ""
                                            const escapeRegExp = (string: string) => string.replace(/[.*+?^${ }()|[\]\\]/g, '\\$&');

                                            const HEADERS_LOOKAHEAD = "(?=ЭМОДЗИ:|ПРИЗЫВ ПОДПИСАТЬСЯ:|ПРИЗЫВ НА ТГ КАНАЛ:|КОДОВОЕ СЛОВО:|ВОПРОС АУДИТОРИИ:|!!!|$)"
                                            const sectionRegex = new RegExp(`(${escapeRegExp(TARGET_SUBHEADER)})([\\s\\S]*?)${HEADERS_LOOKAHEAD}`, 'i')

                                            newPrompt = newPrompt.replace(sectionRegex, "")
                                            newPrompt = newPrompt.replace(/\n{3,}/g, "\n\n").trim()

                                            if (checked) {
                                                const CLEAN_BLOCK = `\n\n${TARGET_SUBHEADER}\n${TARGET_BODY}`
                                                newPrompt = newPrompt + CLEAN_BLOCK
                                            }
                                            setSystemPrompt(newPrompt)
                                            updateAgentPrompt(agent.id, newPrompt)
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
                                                if (useSubscribe) {
                                                    saveSetting("subscribeLink", subscribeLink)

                                                    const TARGET_SUBHEADER = "ПРИЗЫВ ПОДПИСАТЬСЯ:"
                                                    const TARGET_BODY = `В конце каждого ответа добавляй призыв подписаться на этот аккаунт: ${subscribeLink}`

                                                    let newPrompt = systemPrompt || ""
                                                    const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

                                                    const HEADERS_LOOKAHEAD = "(?=ЭМОДЗИ:|ПРИЗЫВ ПОДПИСАТЬСЯ:|ПРИЗЫВ НА ТГ КАНАЛ:|КОДОВОЕ СЛОВО:|ВОПРОС АУДИТОРИИ:|!!!|$)"
                                                    const sectionRegex = new RegExp(`(${escapeRegExp(TARGET_SUBHEADER)})([\\s\\S]*?)${HEADERS_LOOKAHEAD}`, 'i')

                                                    newPrompt = newPrompt.replace(sectionRegex, "")
                                                    newPrompt = newPrompt.replace(/\n{3,}/g, "\n\n").trim()

                                                    const CLEAN_BLOCK = `\n\n${TARGET_SUBHEADER}\n${TARGET_BODY}`
                                                    newPrompt = newPrompt + CLEAN_BLOCK

                                                    setSystemPrompt(newPrompt)
                                                    updateAgentPrompt(agent.id, newPrompt)
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
                                            saveSetting("useLinkInBio", checked)

                                            const TARGET_SUBHEADER = "ПРИЗЫВ НА ТГ КАНАЛ:"
                                            const TARGET_BODY = "В конце каждого ответа добавляй призыв перейти по ссылке в шапке профиля и подписаться на ТГ канал."

                                            let newPrompt = systemPrompt || ""
                                            const escapeRegExp = (string: string) => string.replace(/[.*+?^${ }()|[\]\\]/g, '\\$&');

                                            const HEADERS_LOOKAHEAD = "(?=ЭМОДЗИ:|ПРИЗЫВ ПОДПИСАТЬСЯ:|ПРИЗЫВ НА ТГ КАНАЛ:|КОДОВОЕ СЛОВО:|ВОПРОС АУДИТОРИИ:|!!!|$)"
                                            const sectionRegex = new RegExp(`(${escapeRegExp(TARGET_SUBHEADER)})([\\s\\S]*?)${HEADERS_LOOKAHEAD}`, 'i')

                                            newPrompt = newPrompt.replace(sectionRegex, "")
                                            newPrompt = newPrompt.replace(/\n{3,}/g, "\n\n").trim()

                                            if (checked) {
                                                const CLEAN_BLOCK = `\n\n${TARGET_SUBHEADER}\n${TARGET_BODY}`
                                                newPrompt = newPrompt + CLEAN_BLOCK
                                            }
                                            setSystemPrompt(newPrompt)
                                            updateAgentPrompt(agent.id, newPrompt)
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
                                                saveSetting("codeWord", "")
                                            } else {
                                                currentWord = "START"
                                                setCodeWord(currentWord)
                                                saveSetting("codeWord", currentWord)
                                            }

                                            const TARGET_SUBHEADER = "КОДОВОЕ СЛОВО:"
                                            const TARGET_BODY = `В конце каждого ответа пиши: "Напиши в директ кодовое слово '${currentWord || codeWord || "СЛОВО"}' чтобы получить гайд/бонус"`

                                            let newPrompt = systemPrompt || ""
                                            const escapeRegExp = (string: string) => string.replace(/[.*+?^${ }()|[\]\\]/g, '\\$&');

                                            const HEADERS_LOOKAHEAD = "(?=ЭМОДЗИ:|ПРИЗЫВ ПОДПИСАТЬСЯ:|ПРИЗЫВ НА ТГ КАНАЛ:|КОДОВОЕ СЛОВО:|ВОПРОС АУДИТОРИИ:|!!!|$)"
                                            const sectionRegex = new RegExp(`(${escapeRegExp(TARGET_SUBHEADER)})([\\s\\S]*?)${HEADERS_LOOKAHEAD}`, 'i')

                                            newPrompt = newPrompt.replace(sectionRegex, "")
                                            newPrompt = newPrompt.replace(/\n{3,}/g, "\n\n").trim()

                                            if (checked) {
                                                const CLEAN_BLOCK = `\n\n${TARGET_SUBHEADER}\n${TARGET_BODY}`
                                                newPrompt = newPrompt + CLEAN_BLOCK
                                            }
                                            setSystemPrompt(newPrompt)
                                            updateAgentPrompt(agent.id, newPrompt)
                                        }}
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
                                                    saveSetting("codeWord", codeWord)

                                                    const TARGET_SUBHEADER = "КОДОВОЕ СЛОВО:"
                                                    const TARGET_BODY = `В конце каждого ответа пиши: "Напиши в директ кодовое слово '${codeWord}' чтобы получить гайд/бонус"`

                                                    let newPrompt = systemPrompt || ""
                                                    const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

                                                    const HEADERS_LOOKAHEAD = "(?=ЭМОДЗИ:|ПРИЗЫВ ПОДПИСАТЬСЯ:|ПРИЗЫВ НА ТГ КАНАЛ:|КОДОВОЕ СЛОВО:|ВОПРОС АУДИТОРИИ:|!!!|$)"
                                                    const sectionRegex = new RegExp(`(${escapeRegExp(TARGET_SUBHEADER)})([\\s\\S]*?)${HEADERS_LOOKAHEAD}`, 'i')

                                                    newPrompt = newPrompt.replace(sectionRegex, "")
                                                    newPrompt = newPrompt.replace(/\n{3,}/g, "\n\n").trim()

                                                    const CLEAN_BLOCK = `\n\n${TARGET_SUBHEADER}\n${TARGET_BODY}`
                                                    newPrompt = newPrompt + CLEAN_BLOCK

                                                    setSystemPrompt(newPrompt)
                                                    updateAgentPrompt(agent.id, newPrompt)
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
                                            saveSetting("useAudienceQuestion", checked)

                                            const TARGET_SUBHEADER = "ВОПРОС АУДИТОРИИ:"
                                            const TARGET_BODY = `В конце каждого ответа задавай вовлекающий вопрос аудитории по теме поста: "${audienceQuestion || "ВОПРОС"}"`

                                            let newPrompt = systemPrompt || ""
                                            const escapeRegExp = (string: string) => string.replace(/[.*+?^${ }()|[\]\\]/g, '\\$&');

                                            const HEADERS_LOOKAHEAD = "(?=ЭМОДЗИ:|ПРИЗЫВ ПОДПИСАТЬСЯ:|ПРИЗЫВ НА ТГ КАНАЛ:|КОДОВОЕ СЛОВО:|ВОПРОС АУДИТОРИИ:|!!!|$)"
                                            const sectionRegex = new RegExp(`(${escapeRegExp(TARGET_SUBHEADER)})([\\s\\S]*?)${HEADERS_LOOKAHEAD}`, 'i')

                                            newPrompt = newPrompt.replace(sectionRegex, "")
                                            newPrompt = newPrompt.replace(/\n{3,}/g, "\n\n").trim()

                                            if (checked) {
                                                const CLEAN_BLOCK = `\n\n${TARGET_SUBHEADER}\n${TARGET_BODY}`
                                                newPrompt = newPrompt + CLEAN_BLOCK
                                            }
                                            setSystemPrompt(newPrompt)
                                            updateAgentPrompt(agent.id, newPrompt)
                                        }}
                                    />
                                </div>
                                {/* Audience Question text input removed - now just toggle */}

                                {/* Removed Save Button as we now auto-save on change/blur */}
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

                        {files.length === 0 ? (
                            <div
                                className={`rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${isDragging
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                    : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
                                    }`}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <FileText className="mx-auto h-8 w-8 text-zinc-400 mb-3" />
                                <p className="text-sm text-zinc-500">
                                    {isDragging ? 'Отпустите файл здесь' : 'Перетащите файл сюда или кликните'}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2">
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
                        )}
                    </div>

                    {/* File Preview Modal (for text files only) */}
                    {previewFile && (
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
                    )}
                </div>

                {/* Footer */}
                <DialogFooter className="p-6 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                    <Button
                        variant="outline"
                        onClick={() => setOpen(false)}
                        className="rounded-lg"
                    >
                        Закрыть
                    </Button>
                </DialogFooter>
            </DialogContent >
        </Dialog >
    )
}
