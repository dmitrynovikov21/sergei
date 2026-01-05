"use client"

import React, { useState, useTransition, useRef } from "react"
import { useRouter } from "next/navigation"
import { Agent, AgentFile } from "@prisma/client"
import { addAgentFile, deleteAgentFile, updateAgentSettings } from "@/actions/agents"
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

    // Settings state
    const [useEmoji, setUseEmoji] = useState(agent.useEmoji || false)
    const [useSubscribe, setUseSubscribe] = useState(agent.useSubscribe || false)
    const [useLinkInBio, setUseLinkInBio] = useState(agent.useLinkInBio || false)
    const [codeWord, setCodeWord] = useState(agent.codeWord || "")
    const [audienceQuestion, setAudienceQuestion] = useState(agent.audienceQuestion || "")

    // Check if this is the "Description" agent
    const isDescriptionAgent = agent.name.toLowerCase().includes("описание") || agent.name.toLowerCase().includes("description")

    const saveSettings = (updates: Partial<{
        useEmoji: boolean
        useSubscribe: boolean
        useLinkInBio: boolean
        codeWord: string
        audienceQuestion: string
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
                {/* Instructions Section */}
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

                {/* Files Section */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Файлы</h3>
                        <Dialog open={fileDialogOpen} onOpenChange={setFileDialogOpen}>
                            <DialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                    <Plus className="h-4 w-4 text-zinc-500" />
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                                <DialogHeader>
                                    <DialogTitle>Загрузить файл</DialogTitle>
                                    <DialogDescription>
                                        Выберите файл для добавления в контекст агента
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="py-4">
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".txt,.md,.json,.csv,.xml,.pdf,.jpg,.jpeg,.png,.gif,.webp"
                                        onChange={handleInputChange}
                                        className="hidden"
                                    />
                                    <Button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full"
                                        disabled={isPending}
                                    >
                                        {isPending ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                            <Upload className="mr-2 h-4 w-4" />
                                        )}
                                        Выбрать файл
                                    </Button>
                                    <p className="text-xs text-zinc-500 text-center mt-3">
                                        Форматы: .txt, .md, .json, .jpg, .png, .pdf
                                    </p>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>

                    {files.length > 0 ? (
                        <div className="space-y-2">
                            {files.map((file) => (
                                <div
                                    key={file.id}
                                    onClick={() => handleFileClick(file)}
                                    className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 group cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                                >
                                    <div className="flex items-center gap-2 min-w-0">
                                        {getFileIcon(file.name)}
                                        <span className="text-sm text-zinc-700 dark:text-zinc-300 truncate">{file.name}</span>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                        onClick={(e) => handleDeleteFile(file.id, e)}
                                        disabled={isPending}
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>
                            ))}

                            <div
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                className={cn(
                                    "border border-dashed rounded-lg p-3 flex items-center justify-center text-center cursor-pointer transition-colors",
                                    isDragging
                                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                                        : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
                                )}
                                onClick={() => setFileDialogOpen(true)}
                            >
                                <p className="text-xs text-zinc-500">
                                    {isFileLoading ? "Загрузка..." : "+ Добавить ещё"}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => setFileDialogOpen(true)}
                            className={cn(
                                "border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors",
                                isDragging
                                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                                    : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
                            )}
                        >
                            {isFileLoading ? (
                                <Loader2 className="h-6 w-6 animate-spin text-zinc-400 mb-2" />
                            ) : (
                                <div className="flex gap-1 mb-3 text-zinc-400">
                                    <FileText className="h-6 w-6" />
                                    <FileCode className="h-6 w-6" />
                                </div>
                            )}
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                                {isFileLoading
                                    ? "Загрузка файла..."
                                    : "Перетащите файл сюда или нажмите для загрузки"}
                            </p>
                        </div>
                    )}
                </div>

                {/* Chat Settings (only for Description agent) */}
                {isDescriptionAgent && (
                    <div>
                        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">Настройки описаний</h3>

                        <div className="space-y-3">
                            {/* Emoji Toggle */}
                            <div className="flex items-center justify-between">
                                <Label htmlFor="emoji" className="text-xs text-zinc-600 dark:text-zinc-400">Эмодзи 😎</Label>
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
                                <Label htmlFor="subscribe" className="text-xs text-zinc-600 dark:text-zinc-400">Призыв подписаться</Label>
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
                                <Label htmlFor="link" className="text-xs text-zinc-600 dark:text-zinc-400">Ссылка в био</Label>
                                <Switch
                                    id="link"
                                    checked={useLinkInBio}
                                    onCheckedChange={(checked) => {
                                        setUseLinkInBio(checked)
                                        saveSettings({ useLinkInBio: checked })
                                    }}
                                />
                            </div>

                            {/* Code Word Input */}
                            <div className="space-y-1">
                                <Label htmlFor="codeword" className="text-xs text-zinc-500">Кодовое слово</Label>
                                <Input
                                    id="codeword"
                                    placeholder="Например: ГАЙД"
                                    value={codeWord}
                                    onChange={(e) => setCodeWord(e.target.value)}
                                    onBlur={() => saveSettings({ codeWord })}
                                    className="h-8 text-sm"
                                />
                            </div>

                            {/* Audience Question Input */}
                            <div className="space-y-1">
                                <Label htmlFor="question" className="text-xs text-zinc-500">Вопрос аудитории</Label>
                                <Input
                                    id="question"
                                    placeholder="Ваш вопрос..."
                                    value={audienceQuestion}
                                    onChange={(e) => setAudienceQuestion(e.target.value)}
                                    onBlur={() => saveSettings({ audienceQuestion })}
                                    className="h-8 text-sm"
                                />
                            </div>
                        </div>
                    </div>
                )}
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
