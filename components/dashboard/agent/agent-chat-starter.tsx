"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Agent } from "@prisma/client"
import { createChat } from "@/actions/chat"
import { ArrowUp, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface AgentChatStarterProps {
    agent: Agent
}

export function AgentChatStarter({ agent }: AgentChatStarterProps) {
    const router = useRouter()
    const [isLoading, setIsLoading] = React.useState(false)
    const [input, setInput] = React.useState("")
    const [attachments, setAttachments] = React.useState<{ name: string; type: string; url: string; isUploading?: boolean }[]>([])
    const [isDragging, setIsDragging] = React.useState(false)
    const fileInputRef = React.useRef<HTMLInputElement>(null)

    // File handling
    const uploadFile = async (file: File) => {
        const tempId = Math.random().toString(36).substring(7)
        const reader = new FileReader()

        return new Promise<void>((resolve) => {
            reader.onload = async (e) => {
                const previewUrl = e.target?.result as string

                setAttachments(prev => [...prev, {
                    name: file.name,
                    type: file.type,
                    url: previewUrl,
                    isUploading: true
                }])

                try {
                    const formData = new FormData()
                    formData.append('file', file)

                    const res = await fetch('/api/upload', {
                        method: 'POST',
                        body: formData
                    })

                    if (!res.ok) throw new Error('Upload failed')

                    const data = await res.json()

                    setAttachments(prev => prev.map(att =>
                        att.url === previewUrl ? { ...att, url: data.url, isUploading: false } : att
                    ))
                } catch (error) {
                    toast.error(`Ошибка загрузки: ${file.name}`)
                    setAttachments(prev => prev.filter(att => att.url !== previewUrl))
                } finally {
                    resolve()
                }
            }
            reader.readAsDataURL(file)
        })
    }

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

    const handleStartChat = async (messageOverride?: string) => {
        const messageToSend = messageOverride || input
        // Allow sending with attachments only (no text required)
        if (!messageToSend.trim() && attachments.length === 0) return

        try {
            setIsLoading(true)
            const chatId = await createChat(agent.id)

            // Instructions are now added server-side in the chat API route
            // based on agent settings (useEmoji, useSubscribe, etc.)

            // Store attachments in sessionStorage to avoid 414 URI Too Large error
            if (attachments.length > 0) {
                sessionStorage.setItem(`chat_attachments_${chatId}`, JSON.stringify(attachments))
            }

            router.push(`/dashboard/chat/${chatId}?init=${encodeURIComponent(messageToSend)}`)
        } catch (error) {
            console.error(error)
            toast.error("Не удалось создать чат")
            setIsLoading(false)
        }
    }

    // Quick action buttons
    const quickActions: { text: string; emoji: string }[] = []

    if (isHeadlinesAgent) {
        quickActions.push(
            { text: "Дай 10 заголовков", emoji: "🔥" },
            { text: "Дай 10 на тему", emoji: "💡" }
        )
    }
    // NOTE: quickActions removed for Description agent per task 4.1

    return (
        <div className="space-y-4">
            {/* Chat Input Box - Textarea and button side by side */}
            <div
                className={cn(
                    "bg-zinc-100 dark:bg-zinc-800 rounded-xl border flex flex-col transition-colors",
                    isDragging ? "border-blue-500 bg-blue-50/10" : "border-zinc-200 dark:border-zinc-700"
                )}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={(e) => { e.preventDefault(); setIsDragging(false) }}
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
                    className="flex-1 bg-transparent text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 resize-none outline-none text-base p-4 min-h-[120px]"
                />

                {/* Attachments Preview */}
                {attachments.length > 0 && (
                    <div className="px-4 pb-2 flex flex-wrap gap-2">
                        {attachments.map((att, idx) => (
                            <div key={idx} className="relative group">
                                {att.type.startsWith("image/") ? (
                                    <div className="relative h-16 w-16 rounded-md overflow-hidden border border-zinc-200 dark:border-zinc-700">
                                        <img src={att.url} alt={att.name} className="h-full w-full object-cover" />
                                        {att.isUploading && (
                                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                                <Loader2 className="h-4 w-4 text-white animate-spin" />
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="h-16 w-16 flex items-center justify-center bg-zinc-200 dark:bg-zinc-700 rounded-md text-xs text-center p-1 overflow-hidden">
                                        {att.name}
                                    </div>
                                )}
                                <button
                                    onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                                    className="absolute -top-1.5 -right-1.5 h-5 w-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Footer: Attach Button + Send Button */}
                <div className="flex items-center justify-between p-3 border-t border-zinc-200/50 dark:border-zinc-700/50">
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
                            className="p-2 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300 hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 transition-colors"
                            title="Прикрепить файл"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                            </svg>
                        </button>
                    </div>

                    <button
                        onClick={() => handleStartChat()}
                        disabled={isLoading || (!input.trim() && attachments.length === 0) || attachments.some(a => a.isUploading)}
                        className={cn(
                            "p-2.5 rounded-lg transition-all",
                            (input.trim() || attachments.length > 0) && !attachments.some(a => a.isUploading)
                                ? "bg-orange-500 hover:bg-orange-600 text-white"
                                : "bg-zinc-200 dark:bg-zinc-700 text-zinc-400 dark:text-zinc-500 cursor-not-allowed"
                        )}
                    >
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
                    </button>
                </div>
            </div>

            {/* Quick Action Buttons - Centered, styled, only for Заголовки Каруселей */}
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
                            disabled={isLoading}
                            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-zinc-600 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-700/80 transition-colors shadow-sm"
                        >
                            <span>{action.emoji}</span>
                            <span>{action.text}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}
