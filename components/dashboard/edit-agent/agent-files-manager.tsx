"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Upload, FileText, Eye, Trash2, ImageIcon, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { AgentFile } from "@prisma/client"
import { addAgentFile, deleteAgentFile } from "@/actions/agents"
import { AgentFilePreview } from "@/components/dashboard/agent/right-panel/agent-file-preview"

interface AgentFilesManagerProps {
    agentId: string
    files: AgentFile[]
    setFiles: React.Dispatch<React.SetStateAction<AgentFile[]>>
    isPending: boolean
    startTransition: React.TransitionStartFunction
    refreshRouter: () => void
}

export function AgentFilesManager({
    agentId,
    files,
    setFiles,
    isPending,
    startTransition,
    refreshRouter
}: AgentFilesManagerProps) {
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [previewFile, setPreviewFile] = useState<AgentFile | null>(null)

    const isImageFile = (filename: string) => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(filename)
    const isPdfFile = (filename: string) => /\.pdf$/i.test(filename)

    const handleFileUpload = async (file: File) => {
        if (!file) return

        const maxSize = 10 * 1024 * 1024 // 10MB
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
                    const newFile = await addAgentFile(agentId, file.name, content, file.type)
                    setFiles((prev) => [newFile, ...prev])
                    toast.success("Файл добавлен")
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
        if (fileInputRef.current) {
            fileInputRef.current.value = ""
        }
    }

    const handleDeleteFile = (fileId: string) => {
        startTransition(async () => {
            try {
                await deleteAgentFile(fileId)
                setFiles((prev) => prev.filter((f) => f.id !== fileId))
                toast.success("Файл удален")
                refreshRouter()
            } catch (error) {
                toast.error("Ошибка удаления файла")
            }
        })
    }

    return (
        <div className="p-6">
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

                {/* Dropbox Zone */}
                <div
                    className={cn(
                        "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors",
                        isDragging
                            ? "border-zinc-900 bg-zinc-100 dark:border-zinc-400 dark:bg-zinc-800"
                            : "border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600"
                    )}
                    onDragOver={(e) => {
                        e.preventDefault()
                        setIsDragging(true)
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                        e.preventDefault()
                        setIsDragging(false)
                        const droppedFiles = Array.from(e.dataTransfer.files)
                        droppedFiles.forEach(file => handleFileUpload(file))
                    }}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <Upload className="h-8 w-8 mx-auto mb-2 text-zinc-400" />
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        {isDragging ? "Отпустите файлы" : "Перетащите файлы сюда или нажмите для выбора"}
                    </p>
                    <p className="text-xs text-zinc-400 mt-1">
                        TXT, MD, JSON, CSV, PDF, изображения
                    </p>
                </div>
            </div>



            <div className="space-y-2 pt-2">
                {files.map((file) => (
                    <div
                        key={file.id}
                        className="flex items-center justify-between rounded-xl bg-zinc-50 dark:bg-zinc-800 p-3 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors cursor-pointer group"
                        onClick={() => setPreviewFile(file)}
                    >
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className="shrink-0">
                                {isImageFile(file.name) ? (
                                    <ImageIcon className="h-4 w-4 text-blue-500" />
                                ) : (
                                    <FileText className="h-4 w-4 text-zinc-400" />
                                )}
                            </div>
                            <span className="text-sm font-medium truncate">{file.name}</span>
                            <span className="text-xs text-zinc-400 shrink-0">
                                {file.content.length > 1000
                                    ? `${Math.round(file.content.length / 1024)}KB`
                                    : `${file.content.length} симв.`}
                            </span>
                        </div>
                        <div className="flex gap-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-zinc-500 hover:text-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setPreviewFile(file)
                                }}
                            >
                                <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    handleDeleteFile(file.id)
                                }}
                                disabled={isPending}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                ))}
            </div>

            {/* File Preview Dialog */}
            <AgentFilePreview
                file={previewFile}
                open={!!previewFile}
                onOpenChange={(open) => !open && setPreviewFile(null)}
            />
        </div>
    )
}
