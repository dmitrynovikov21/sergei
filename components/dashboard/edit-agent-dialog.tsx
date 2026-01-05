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
import { Trash2, Upload, FileText, Settings, Eye, Image as ImageIcon, X } from "lucide-react"

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
    const [codeWord, setCodeWord] = useState(agent.codeWord || "")
    const [audienceQuestion, setAudienceQuestion] = useState(agent.audienceQuestion || "")

    // Check if this is Description agent
    const isDescriptionAgent = agent.name.toLowerCase().includes("описание") || agent.name.toLowerCase().includes("description")

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
                setAudienceQuestion(freshAgent.audienceQuestion || "")
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

    // Save codeWord and audienceQuestion (text inputs)
    const handleSaveSettings = () => {
        startTransition(async () => {
            try {
                await updateAgentSettings(agent.id, {
                    codeWord,
                    audienceQuestion
                })
                // Refetch to update textarea with new settings block
                await fetchFreshData()
                toast.success("Настройки сохранены")
            } catch (error) {
                toast.error("Ошибка сохранения")
            }
        })
    }

    const handleFileUpload = async (file: File) => {
        if (!file) return

        // Check file size
        const maxSize = file.type === 'application/pdf' ? 5 * 1024 * 1024 : 2 * 1024 * 1024
        if (file.size > maxSize) {
            toast.error(`Файл слишком большой. Максимум: ${file.type === 'application/pdf' ? '5' : '2'}MB`)
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
                        <Label htmlFor="systemPrompt" className="text-sm font-medium">
                            Системный промпт (инструкции)
                        </Label>
                        <Textarea
                            id="systemPrompt"
                            value={systemPrompt}
                            onChange={(e) => setSystemPrompt(e.target.value)}
                            placeholder="Опишите поведение и роль AI агента..."
                            className="min-h-[180px] font-mono text-sm bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 rounded-xl resize-none"
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

                            <div className="grid gap-4 sm:grid-cols-3">
                                <div className="flex items-center justify-between p-3 bg-white dark:bg-zinc-800 rounded-xl">
                                    <Label htmlFor="edit-emoji" className="text-sm">Эмодзи 😎</Label>
                                    <Switch
                                        id="edit-emoji"
                                        checked={useEmoji}
                                        onCheckedChange={(checked) => {
                                            setUseEmoji(checked)
                                            saveSetting("useEmoji", checked)
                                        }}
                                    />
                                </div>

                                <div className="flex items-center justify-between p-3 bg-white dark:bg-zinc-800 rounded-xl">
                                    <Label htmlFor="edit-subscribe" className="text-sm">Подписаться</Label>
                                    <Switch
                                        id="edit-subscribe"
                                        checked={useSubscribe}
                                        onCheckedChange={(checked) => {
                                            setUseSubscribe(checked)
                                            saveSetting("useSubscribe", checked)
                                        }}
                                    />
                                </div>

                                <div className="flex items-center justify-between p-3 bg-white dark:bg-zinc-800 rounded-xl">
                                    <Label htmlFor="edit-link" className="text-sm">Ссылка в био</Label>
                                    <Switch
                                        id="edit-link"
                                        checked={useLinkInBio}
                                        onCheckedChange={(checked) => {
                                            setUseLinkInBio(checked)
                                            saveSetting("useLinkInBio", checked)
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="edit-codeword" className="text-xs text-zinc-500">
                                        Кодовое слово
                                    </Label>
                                    <Input
                                        id="edit-codeword"
                                        placeholder="Например: ГАЙД"
                                        value={codeWord}
                                        onChange={(e) => setCodeWord(e.target.value)}
                                        className="h-10 bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 rounded-xl"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="edit-question" className="text-xs text-zinc-500">
                                        Вопрос аудитории
                                    </Label>
                                    <Input
                                        id="edit-question"
                                        placeholder="Ваш вопрос..."
                                        value={audienceQuestion}
                                        onChange={(e) => setAudienceQuestion(e.target.value)}
                                        className="h-10 bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 rounded-xl"
                                    />
                                </div>
                            </div>

                            <Button
                                onClick={handleSaveSettings}
                                disabled={isPending}
                                size="sm"
                                variant="outline"
                                className="rounded-lg"
                            >
                                {isPending ? (
                                    <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                                ) : null}
                                Сохранить настройки
                            </Button>
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
                                                        // Open in new tab
                                                        window.open(file.content, '_blank')
                                                    } else {
                                                        // Show text in modal
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
            </DialogContent>
        </Dialog>
    )
}
