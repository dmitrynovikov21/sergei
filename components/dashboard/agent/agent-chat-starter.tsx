"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Agent } from "@prisma/client"
import { createChat } from "@/actions/chat"
import { getDatasets } from "@/actions/datasets"
import { useStartChat } from "@/hooks/use-start-chat"
import { ArrowUp, Loader2, ChevronDown } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useFileUpload } from "@/hooks/use-file-upload"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface AgentChatStarterProps {
    agent: Agent
}

export function AgentChatStarter({ agent }: AgentChatStarterProps) {
    const router = useRouter()
    const [isLoading, setIsLoading] = React.useState(false)
    const [input, setInput] = React.useState("")
    const { attachments, uploadFile, removeAttachment, clearAttachments } = useFileUpload()
    const [isDragging, setIsDragging] = React.useState(false)
    const fileInputRef = React.useRef<HTMLInputElement>(null)

    // Dataset state
    const [datasets, setDatasets] = React.useState<{ id: string, name: string }[]>([])
    const [selectedDatasetId, setSelectedDatasetId] = React.useState<string | null>(null)

    React.useEffect(() => {
        getDatasets().then(ds => setDatasets(ds))
    }, [])

    // File upload logic is now handled by useFileUpload hook

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files)
            setIsLoading(true) // Block button while processing initial read

            // Process sequentially to ensure order and avoid state race
            for (const file of files) {
                await uploadFile(file)
            }

            setIsLoading(false)
        }
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        if (e.dataTransfer.files) {
            Array.from(e.dataTransfer.files).forEach(file => {
                if (file.type.startsWith('image/') || file.type === 'application/pdf') {
                    uploadFile(file)
                }
            })
        }
    }

    // Check if this is the "Description" agent or "Headlines" agent
    const isDescriptionAgent = agent.name.toLowerCase().includes("описание") || agent.name.toLowerCase().includes("description")
    const isHeadlinesAgent = agent.name.toLowerCase().includes("заголовки") || agent.name.toLowerCase().includes("headlines")

    const { startChat, isPending } = useStartChat()

    // Sync local loading state with hook pending state
    // We keep local isLoading for file uploads, so effective loading is either
    const isBusy = isLoading || isPending

    const handleStartChat = async (messageOverride?: string) => {
        const messageToSend = messageOverride || input
        // Allow sending with attachments only (no text required)
        if (!messageToSend.trim() && attachments.length === 0) return

        startChat(agent.id, {
            initialMessage: messageToSend,
            attachments: attachments,
            datasetId: selectedDatasetId || undefined
        })
    }

    // Quick action buttons - NO EMOJI
    const quickActions: { text: string }[] = []

    if (isHeadlinesAgent) {
        quickActions.push(
            { text: "Дай 10 заголовков" },
            { text: "Дай 10 на тему" }
        )
    }
    // NOTE: quickActions removed for Description agent per task 4.1

    const dropZoneRef = React.useRef<HTMLDivElement>(null)

    return (
        <div className="space-y-4">
            {/* Chat Input Box - Dark theme matching chat design */}
            <div
                ref={dropZoneRef}
                className={cn(
                    "bg-card dark:bg-[#30302E] rounded-md border flex flex-col transition-colors",
                    isDragging ? "border-accent bg-accent/5" : "border-border"
                )}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={(e) => {
                    e.preventDefault()
                    // Only set isDragging to false if we're leaving the drop zone entirely
                    if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget as Node)) {
                        setIsDragging(false)
                    }
                }}
                onDrop={handleDrop}
            >
                {/* Textarea */}
                <textarea
                    placeholder="Напишите сообщение..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault()
                            handleStartChat()
                        }
                    }}
                    className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground/60 resize-none outline-none text-[15px] p-4 min-h-[140px]"
                />

                {/* Attachments Preview */}
                {attachments.length > 0 && (
                    <div className="px-4 pb-2 flex flex-wrap gap-2">
                        {attachments.map((att, idx) => (
                            <div key={idx} className="relative group">
                                {att.type.startsWith("image/") ? (
                                    <div className="relative h-16 w-16 rounded-md overflow-hidden border border-border/50">
                                        <img src={att.url} alt={att.name} className="h-full w-full object-cover" />
                                        {att.isUploading && (
                                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                                <Loader2 className="h-4 w-4 text-white animate-spin" />
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="h-16 w-16 flex items-center justify-center bg-muted rounded-md text-xs text-center p-1 overflow-hidden text-muted-foreground">
                                        {att.name}
                                    </div>
                                )}
                                <button
                                    onClick={() => removeAttachment(idx)}
                                    className="absolute -top-1.5 -right-1.5 h-5 w-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Footer: Attach Button + Dataset Selector + Send Button */}
                <div className="flex items-center justify-between p-3 border-t border-border/30">
                    <div className="flex items-center gap-2">
                        <input
                            type="file"
                            multiple
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            accept="image/*,application/pdf"
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                            title="Прикрепить файл"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                            </svg>
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Dataset Selector */}
                        <Popover>
                            <PopoverTrigger asChild>
                                <button className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                                    <span>{selectedDatasetId ? datasets.find(d => d.id === selectedDatasetId)?.name : "Без контекста"}</span>
                                    <ChevronDown className="h-3 w-3" />
                                </button>
                            </PopoverTrigger>
                            <PopoverContent side="top" align="start" className="w-64 p-1 bg-card border-border/50 max-h-64 overflow-y-auto scrollbar-none">
                                <button
                                    onClick={() => setSelectedDatasetId(null)}
                                    className={cn(
                                        "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors",
                                        !selectedDatasetId ? "bg-muted" : "hover:bg-muted"
                                    )}
                                >
                                    Без контекста
                                </button>
                                {datasets.map(ds => (
                                    <button
                                        key={ds.id}
                                        onClick={() => setSelectedDatasetId(ds.id)}
                                        className={cn(
                                            "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors truncate",
                                            selectedDatasetId === ds.id ? "bg-muted" : "hover:bg-muted"
                                        )}
                                    >
                                        <span className="truncate">{ds.name}</span>
                                    </button>
                                ))}
                            </PopoverContent>
                        </Popover>

                        <button
                            onClick={() => handleStartChat()}
                            disabled={isBusy || (!input.trim() && attachments.length === 0) || attachments.some(a => a.isUploading)}
                            className={cn(
                                "p-2.5 rounded-lg transition-all",
                                (input.trim() || attachments.length > 0) && !attachments.some(a => a.isUploading)
                                    ? "bg-accent hover:bg-accent/80 text-white"
                                    : "bg-muted text-muted-foreground cursor-not-allowed"
                            )}
                        >
                            {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Quick Action Buttons - NO EMOJI */}
            {quickActions.length > 0 && (
                <div className="flex justify-center gap-3">
                    {quickActions.map((action, i) => (
                        <button
                            key={i}
                            onClick={() => {
                                if (action.text.includes("на тему")) {
                                    setInput(action.text + " ")
                                } else {
                                    handleStartChat(action.text)
                                }
                            }}
                            disabled={isBusy}
                            className="px-4 py-2.5 text-sm font-medium text-muted-foreground border border-border rounded-xl hover:text-foreground hover:bg-muted/50 transition-colors"
                        >
                            {action.text}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}
