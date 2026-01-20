"use client"

import React, { useState, useTransition, useRef } from "react"
import { useRouter } from "next/navigation"
import { Agent, AgentFile } from "@prisma/client"
import { addAgentFile, deleteAgentFile, updateAgentSettings, updateAgentDataset } from "@/actions/agents"
import { getDataset, getDatasets } from "@/actions/datasets"
import { FileText, FileCode, Plus, Trash2, Upload, Loader2, X, Image as ImageIcon } from "lucide-react"
import { EditAgentDialog } from "@/components/dashboard/edit-agent-dialog"
import { Button } from "@/components/ui/button"
import { Settings } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Icons } from "@/components/shared/icons"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface AgentRightPanelProps {
    agent: Agent & { files?: AgentFile[] }
}

export function AgentRightPanel({ agent }: AgentRightPanelProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [isFileLoading, setIsFileLoading] = useState(false)
    const [files, setFiles] = useState<AgentFile[]>(agent.files || [])
    const [isDragging, setIsDragging] = useState(false)
    const [fileDialogOpen, setFileDialogOpen] = useState(false)
    const [previewFile, setPreviewFile] = useState<AgentFile | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // User Context state
    const [userContext, setUserContext] = useState((agent as any).userContext || "")

    // Settings state
    const [useEmoji, setUseEmoji] = useState(agent.useEmoji || false)
    const [useSubscribe, setUseSubscribe] = useState(agent.useSubscribe || false)
    const [useLinkInBio, setUseLinkInBio] = useState(agent.useLinkInBio || false)
    const [codeWord, setCodeWord] = useState(agent.codeWord || "")
    const [audienceQuestion, setAudienceQuestion] = useState(agent.audienceQuestion || "")

    const [subscribeLink, setSubscribeLink] = useState((agent as any).subscribeLink || "")

    // Dataset info for Headlines agent
    const [datasetName, setDatasetName] = useState<string | null>(null)
    const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>((agent as any).datasetId || null)
    const [datasets, setDatasets] = useState<{ id: string, name: string }[]>([])

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

    const saveUserContext = () => {
        startTransition(async () => {
            try {
                await updateAgentSettings(agent.id, { userContext } as any)
                toast.success("Контекст сохранен")
                router.refresh()
            } catch (error) {
                toast.error("Ошибка сохранения")
            }
        })
    }

    const isImageFile = (filename: string) => {
        return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(filename)
    }

    const isPdfFile = (filename: string) => {
        return /\.pdf$/i.test(filename)
    }

    const getFileIcon = (filename: string) => {
        if (isImageFile(filename)) return <ImageIcon className="h-4 w-4 text-blue-500" />
        if (isPdfFile(filename)) return <FileText className="h-4 w-4 text-red-500" />
        return <FileText className="h-4 w-4 text-zinc-500" />
    }

    const handleFileUpload = async (file: File) => {
        if (!file) return

        // Check file size (max 5MB for PDFs, 2MB for others)
        const maxSize = file.type === 'application/pdf' ? 5 * 1024 * 1024 : 2 * 1024 * 1024
        if (file.size > maxSize) {
            toast.error(`Файл слишком большой. Максимум: ${file.type === 'application/pdf' ? '5' : '2'}MB`)
            return
        }

        setIsFileLoading(true)

        // Read images and PDFs as base64, everything else as text
        const isBinaryFile = file.type.startsWith('image/') || file.type === 'application/pdf'

        if (isBinaryFile) {
            const reader = new FileReader()
            reader.onload = async (event) => {
                const content = event.target?.result as string

                try {
                    const newFile = await addAgentFile(agent.id, file.name, content, file.type)
                    setFiles((prev) => [newFile, ...prev])
                    toast.success("Файл добавлен")
                    // Don't refresh - local state is already updated
                } catch (error) {
                    toast.error("Ошибка загрузки файла")
                } finally {
                    setIsFileLoading(false)
                }
            }
            reader.readAsDataURL(file)
        } else {
            // Text files
            const reader = new FileReader()
            reader.onload = async (event) => {
                const content = event.target?.result as string

                try {
                    const newFile = await addAgentFile(agent.id, file.name, content, file.type)
                    setFiles((prev) => [newFile, ...prev])
                    toast.success("Файл добавлен")
                    // Don't refresh - local state is already updated
                } catch (error) {
                    toast.error("Ошибка загрузки файла")
                } finally {
                    setIsFileLoading(false)
                }
            }
            reader.readAsText(file)
        }
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            handleFileUpload(file)
            setFileDialogOpen(false)
        }
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

    const handleDeleteFile = (fileId: string, e: React.MouseEvent) => {
        e.stopPropagation()
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

    const handleFileClick = (file: AgentFile) => {
        setPreviewFile(file)
    }

    const renderFilePreview = () => {
        if (!previewFile) return null

        const isImage = previewFile.content.startsWith('data:image') || isImageFile(previewFile.name)
        const isPdf = isPdfFile(previewFile.name)

        if (isImage && previewFile.content.startsWith('data:image')) {
            return (
                <div className="flex items-center justify-center p-4">
                    <img
                        src={previewFile.content}
                        alt={previewFile.name}
                        className="max-w-full max-h-[70vh] rounded-lg object-contain"
                    />
                </div>
            )
        }

        if (isPdf) {
            return (
                <div className="p-4 text-center">
                    <FileText className="h-16 w-16 text-red-500 mx-auto mb-4" />
                    <p className="text-zinc-600 dark:text-zinc-400 mb-4">PDF файл</p>
                    <Button variant="outline" onClick={() => {
                        const link = document.createElement('a')
                        link.href = previewFile.content
                        link.download = previewFile.name
                        link.click()
                    }}>
                        Скачать PDF
                    </Button>
                </div>
            )
        }

        return (
            <div className="p-4">
                <pre className="bg-zinc-100 dark:bg-zinc-800 rounded-lg p-4 text-sm overflow-auto max-h-[60vh] whitespace-pre-wrap font-mono">
                    {previewFile.content}
                </pre>
            </div>
        )
    }

    return (
        <>
            <div className="w-[280px] shrink-0 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 flex flex-col gap-6 h-fit ml-6">

                {/* "Invested" Badge (High Value) - Minimalist Style */}
                {isDescriptionAgent && (
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-2 justify-center">
                        <span>💎</span>
                        <span>В меня вложили уже много</span>
                    </div>
                )}

                {/* Dataset Selector - for both Headlines and Description agents */}
                {(isHeadlinesAgent || isDescriptionAgent) && (
                    <div className="space-y-2">
                        <Label className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Датасет (контекст)</Label>
                        <Select
                            value={selectedDatasetId || "none"}
                            onValueChange={handleDatasetChange}
                        >
                            <SelectTrigger className="w-full h-9 text-sm">
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
                )}


                {/* Instructions Section - Hide for Headlines agent (per task 3.1) */}
                {!isHeadlinesAgent && (
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Инструкции</h3>
                            <EditAgentDialog
                                agent={agent}
                                trigger={
                                    <Button variant="ghost" size="icon" className="h-7 w-7">
                                        <Settings className="h-4 w-4 text-zinc-500" />
                                    </Button>
                                }
                            />
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                            {agent.systemPrompt
                                ? `${agent.systemPrompt.slice(0, 100)}...`
                                : "Добавьте инструкции для настройки ответов Claude"}
                        </p>
                    </div>
                )}

                {/* Chat Settings (only for Description agent) - MOVED UP BEFORE FILES (Optional, but user said 'Always visible') */}
                {isDescriptionAgent && (
                    <div>
                        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">Настройки генерации</h3>

                        <div className="space-y-4">
                            {/* Emoji Toggle */}
                            <div className="flex items-center justify-between">
                                <Label htmlFor="emoji" className="text-sm text-zinc-600 dark:text-zinc-400 font-medium">Эмодзи</Label>
                                <Switch
                                    id="emoji"
                                    checked={useEmoji}
                                    onCheckedChange={(checked) => {
                                        setUseEmoji(checked)
                                        saveSettings({ useEmoji: checked })
                                    }}
                                />
                            </div>

                            {/* Subscribe Toggle */}
                            <div className="flex items-center justify-between">
                                <Label htmlFor="subscribe" className="text-sm text-zinc-600 dark:text-zinc-400 font-medium">Призыв подписаться</Label>
                                <Switch
                                    id="subscribe"
                                    checked={useSubscribe}
                                    onCheckedChange={(checked) => {
                                        setUseSubscribe(checked)
                                        saveSettings({ useSubscribe: checked })
                                    }}
                                />
                            </div>

                            {/* Link in Bio Toggle */}
                            <div className="flex items-center justify-between">
                                <Label htmlFor="link" className="text-sm text-zinc-600 dark:text-zinc-400 font-medium">Призыв на ТГ в шапке профиля</Label>
                                <Switch
                                    id="link"
                                    checked={useLinkInBio}
                                    onCheckedChange={(checked) => {
                                        setUseLinkInBio(checked)
                                        saveSettings({ useLinkInBio: checked })
                                    }}
                                />
                            </div>

                            {/* Unified Link Input */}
                            {(useSubscribe || useLinkInBio) && (
                                <div className="pt-1 pb-2">
                                    <Input
                                        placeholder="@ваш_ник или ссылка (https://...)"
                                        value={subscribeLink}
                                        onChange={(e) => setSubscribeLink(e.target.value)}
                                        onBlur={() => saveSettings({ subscribeLink })}
                                        className="h-9 text-sm bg-zinc-50 dark:bg-zinc-800"
                                    />
                                    <p className="text-[10px] text-zinc-400 mt-1">
                                        Ссылка будет добавлена в призыв.
                                    </p>
                                </div>
                            )}

                            {/* Code Word Toggle & Input */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="codeword-toggle" className="text-sm text-zinc-600 dark:text-zinc-400 font-medium">Кодовое слово</Label>
                                    <Switch
                                        id="codeword-toggle"
                                        checked={!!codeWord}
                                        onCheckedChange={(checked) => {
                                            if (!checked) {
                                                setCodeWord("")
                                                saveSettings({ codeWord: "" })
                                            } else {
                                                // Initialize with space or something if needed, or just let UI show input
                                                // But we rely on !!codeWord, so we need to set it to something non-empty?
                                                // Actually, let's use a separate local state for "Expanded" if we want to allow empty input?
                                                // No, empty string disables it in the backend logic.
                                                // So we set it to a placeholder or just " " and let user type?
                                                // Better: Use a local state `showCodeWord` for UI toggle.
                                                // But I need to simplify.
                                                // Let's set it to "Гайд" (default) if turning on?
                                                // Or just force user to type.
                                                // I'll check `codeWord` state.
                                                setCodeWord("Гайд") // UX: Set default
                                                saveSettings({ codeWord: "Гайд" })
                                            }
                                        }}
                                    />
                                </div>
                                {!!codeWord && (
                                    <Input
                                        id="codeword"
                                        placeholder="Например: ГАЙД"
                                        value={codeWord}
                                        onChange={(e) => setCodeWord(e.target.value)}
                                        onBlur={() => saveSettings({ codeWord })}
                                        className="h-8 text-sm"
                                    />
                                )}
                            </div>

                            {/* Audience Question Toggle (No Input) */}
                            <div className="flex items-center justify-between">
                                <Label htmlFor="question-toggle" className="text-sm text-zinc-600 dark:text-zinc-400 font-medium">Вопрос аудитории</Label>
                                <Switch
                                    id="question-toggle"
                                    checked={!!audienceQuestion}
                                    onCheckedChange={(checked) => {
                                        const val = checked ? "Какая у вас ниша?" : ""
                                        setAudienceQuestion(val)
                                        saveSettings({ audienceQuestion: val })
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Active Instructions Preview (To reassure user) */}

            </div>

            {/* File Preview Dialog */}
            <Dialog open={!!previewFile} onOpenChange={(open) => !open && setPreviewFile(null)}>
                <DialogContent className="max-w-3xl max-h-[85vh] overflow-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {previewFile && getFileIcon(previewFile.name)}
                            {previewFile?.name}
                        </DialogTitle>
                    </DialogHeader>
                    {renderFilePreview()}
                </DialogContent>
            </Dialog>
        </>
    )
}
