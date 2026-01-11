"use client"

import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import ReactMarkdown from "react-markdown"
import { saveMessage, createChat } from "@/actions/chat"
import type { Agent } from "@prisma/client"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Icons } from "@/components/shared/icons"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {
    Command,
    CommandGroup,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

interface Message {
    id: string
    role: "user" | "assistant" | "system"
    content: string
    createdAt: Date
    attachments?: Attachment[]
}

interface ChatInterfaceProps {
    chatId?: string // Optional for new chats
    initialMessages: Message[]
    agentName: string
    agentIcon?: string | null
    agent: Agent
    initialInput?: string // New prop
}

// Define Attachment interface
interface Attachment {
    name: string
    type: string
    url: string
    isUploading?: boolean
}

interface ChatInputProps {
    input: string
    setInput: (value: string) => void
    onSubmit: (e: React.FormEvent) => void
    isPending: boolean
    centered?: boolean
    onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void
    onFileDrop: (files: FileList) => void
    attachments: Attachment[]
    removeAttachment: (index: number) => void
    onStop?: () => void
}

function ChatInput({ input, setInput, onSubmit, isPending, centered = false, onFileSelect, onFileDrop, attachments, removeAttachment, onStop }: ChatInputProps) {
    // Separate refs for different file types if needed, or share one
    const imageInputRef = useRef<HTMLInputElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [isDragging, setIsDragging] = useState(false)

    // Stop handler passed from parent? We need it here or handle in parent.
    // For now, let's assume parent handles stop via a new prop or we just show the visual state here.
    // User asked for "Stop request". We need a callback `onStop`.

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
        e.stopPropagation()
        setIsDragging(false)
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            onFileDrop(e.dataTransfer.files)
        }
    }

    return (
        <form
            onSubmit={onSubmit}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
                "relative flex flex-col gap-3 rounded-3xl border border-zinc-200/50 dark:border-zinc-700/40 p-4 focus-within:ring-1 focus-within:ring-zinc-300 dark:focus-within:ring-zinc-600 transition-all bg-[#F4F4F5] dark:bg-[#1a1a1a]",
                centered ? "w-full shadow-sm" : "",
                isDragging && "ring-2 ring-blue-500 border-blue-500 bg-blue-50 dark:bg-blue-900/20"
            )}
        >
            {/* Drag indicator */}
            {isDragging && (
                <div className="absolute inset-0 flex items-center justify-center bg-blue-50/80 dark:bg-blue-900/50 rounded-3xl z-10 pointer-events-none">
                    <p className="text-blue-600 dark:text-blue-400 font-medium">Отпустите для загрузки</p>
                </div>
            )}

            {/* Attachment Previews */}
            {attachments.length > 0 && (
                <div className="flex gap-2 mb-2 flex-wrap">
                    {attachments.map((att, i) => (
                        <div key={i} className="relative group rounded-md border border-zinc-200 dark:border-zinc-700 overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                            {att.type.startsWith('image/') ? (
                                <div className="relative">
                                    <img src={att.url} alt={att.name} className={cn("h-16 w-16 object-cover", att.isUploading && "opacity-50")} />
                                    {att.isUploading && (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <Icons.spinner className="h-4 w-4 animate-spin text-zinc-900" />
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="h-16 w-16 flex items-center justify-center text-zinc-500 relative">
                                    {att.isUploading ? (
                                        <Icons.spinner className="h-5 w-5 animate-spin" />
                                    ) : (
                                        <Icons.paperclip className="h-6 w-6" />
                                    )}
                                </div>
                            )}
                            <button
                                type="button"
                                onClick={() => removeAttachment(i)}
                                disabled={att.isUploading}
                                className="absolute top-0.5 right-0.5 bg-black/50 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0"
                            >
                                <Icons.close className="h-3 w-3" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        if (!isPending) {
                            onSubmit(e)
                        }
                    }
                }}
                placeholder="Введите ваш запрос..."
                className="w-full min-h-[48px] max-h-[200px] resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-1 py-1 text-base text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
                rows={1}
                onDrop={handleDrop}
            />

            {/* Hidden Inputs */}
            <input
                type="file"
                ref={imageInputRef}
                className="hidden"
                multiple
                accept="image/*"
                onChange={onFileSelect}
            />
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                multiple
                accept=".pdf,.txt,.md,.json,.csv"
                onChange={onFileSelect}
            />

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 rounded-lg text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-all"
                            >
                                <Icons.add className="h-5 w-5" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="w-48 p-1">
                            <button
                                type="button"
                                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                                onClick={() => imageInputRef.current?.click()}
                            >
                                <Icons.image className="h-4 w-4" />
                                <span>Фото</span>
                            </button>
                            <button
                                type="button"
                                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Icons.paperclip className="h-4 w-4" />
                                <span>Документ</span>
                            </button>
                        </PopoverContent>
                    </Popover>
                </div>

                <div className="flex items-center gap-2">
                    {/* Send / Stop Button */}
                    <Button
                        type={isPending ? "button" : "submit"}
                        size="icon"
                        onClick={(e) => {
                            if (isPending && onStop) {
                                e.preventDefault()
                                onStop()
                            }
                        }}
                        className={cn(
                            "h-8 w-8 rounded-lg shrink-0 transition-opacity",
                            isPending
                                ? "bg-zinc-200 text-zinc-900 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-200"
                                : "bg-[#D97757] text-white hover:bg-[#c56a4c] disabled:opacity-40 disabled:bg-zinc-200 disabled:text-zinc-400"
                        )}
                        disabled={!isPending && (!input.trim() && attachments.length === 0)}
                    >
                        {isPending ? (
                            <div className="h-3 w-3 bg-current rounded-sm" />
                        ) : (
                            <Icons.arrowUp className="h-4 w-4" />
                        )}
                        <span className="sr-only">{isPending ? "Остановить" : "Отправить"}</span>
                    </Button>
                </div>
            </div>
        </form>
    )
}

export function ChatInterface({ chatId: initialChatId, initialMessages, agentName, agentIcon, agent, initialInput }: ChatInterfaceProps) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [chatId, setChatId] = useState(initialChatId)
    // Update messages type to include attachments
    const [messages, setMessages] = useState<any[]>(initialMessages)
    const [input, setInput] = useState(initialInput || "")
    const [isLoading, setIsLoading] = useState(false)

    // Parse initial attachments from URL
    const initialAttachments = useMemo(() => {
        const attParam = searchParams.get("attachments")
        if (attParam) {
            try {
                return JSON.parse(decodeURIComponent(attParam))
            } catch (e) {
                console.error("Failed to parse attachments", e)
                return []
            }
        }
        return []
    }, [searchParams])

    const [attachments, setAttachments] = useState<Attachment[]>(initialAttachments)

    const isPending = isLoading
    const scrollRef = useRef<HTMLDivElement>(null)
    const scrollContainerRef = useRef<HTMLDivElement>(null)
    const [shouldAutoScroll, setShouldAutoScroll] = useState(false)
    const isUserScrollingRef = useRef(false)
    const hasAutoSubmittedRef = useRef(false)

    // Feedback dialog state
    const [feedbackOpen, setFeedbackOpen] = useState(false)
    const [feedbackText, setFeedbackText] = useState("")
    const [feedbackMessageId, setFeedbackMessageId] = useState<string | null>(null)

    // Check if user is near bottom (within 100px)
    const isNearBottom = useCallback(() => {
        const container = scrollContainerRef.current
        if (!container) return true
        const threshold = 100
        return container.scrollHeight - container.scrollTop - container.clientHeight < threshold
    }, [])

    // Track user scroll to detect manual scrolling up
    useEffect(() => {
        const container = scrollContainerRef.current
        if (!container) return
        const handleScroll = () => {
            // If user scrolled up (not near bottom), mark as user scrolling
            isUserScrollingRef.current = !isNearBottom()
        }

        container.addEventListener('scroll', handleScroll)
        return () => container.removeEventListener('scroll', handleScroll)
    }, [isNearBottom])

    // Unified scroll management
    useEffect(() => {
        if (!scrollContainerRef.current) return

        // On initial mount, ensure we're at the top
        if (messages === initialMessages) {
            scrollContainerRef.current.scrollTop = 0
            return
        }

        // Only auto-scroll when new messages are added AND user is not manually scrolling up
        if (shouldAutoScroll && scrollRef.current && !isUserScrollingRef.current) {
            scrollRef.current.scrollIntoView({ behavior: "smooth" })
        }
        setShouldAutoScroll(false)
    }, [messages, shouldAutoScroll, initialMessages])

    // File handlers
    // Unified upload handler
    const uploadFile = async (file: File) => {
        // Create optimistic attachment
        const tempId = Math.random().toString(36).substring(7)
        const reader = new FileReader()

        return new Promise<void>((resolve) => {
            reader.onload = async (e) => {
                const previewUrl = e.target?.result as string

                // Add to state immediately with uploading flag
                setAttachments(prev => [...prev, {
                    name: file.name,
                    type: file.type,
                    url: previewUrl,
                    isUploading: true
                }])

                try {
                    // Upload to API
                    const formData = new FormData()
                    formData.append('file', file)

                    const res = await fetch('/api/upload', {
                        method: 'POST',
                        body: formData
                    })

                    if (!res.ok) throw new Error('Upload failed')

                    const data = await res.json()

                    // Update URL with server URL and clear uploading flag
                    setAttachments(prev => prev.map(att =>
                        att.url === previewUrl ? { ...att, url: data.url, isUploading: false } : att
                    ))
                } catch (error) {
                    console.error('Upload failed:', error)
                    toast.error(`Ошибка загрузки: ${file.name}`)
                    // Remove failed attachment
                    setAttachments(prev => prev.filter(att => att.url !== previewUrl))
                } finally {
                    resolve()
                }
            }
            reader.readAsDataURL(file)
        })
    }

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            Array.from(e.target.files).forEach(uploadFile)
        }
        // Reset input
        e.target.value = ''
    }

    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index))
    }

    const handleFileDrop = (files: FileList) => {
        Array.from(files).forEach(file => {
            if (file.type.startsWith('image/') || file.type === 'application/pdf') {
                uploadFile(file)
            }
        })
    }

    // ... (imports remain)

    const abortControllerRef = useRef<AbortController | null>(null)

    // Handle Stop
    const handleStop = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
            abortControllerRef.current = null
            setIsLoading(false)
        }
    }

    const handleSendMessage = async (content: string) => {
        if ((!content.trim() && attachments.length === 0) || isPending) return

        const userMessage = content.trim()
        const currentAttachments = [...attachments]

        const userMsg: Message = {
            id: Date.now().toString(),
            role: "user",
            content: userMessage,
            createdAt: new Date(),
            attachments: currentAttachments
        }

        setMessages((prev) => [...prev, userMsg])
        setInput("")
        setAttachments([])
        isUserScrollingRef.current = false
        setShouldAutoScroll(true)

        // For first message event dispatch 
        if (initialMessages.length === 0 && messages.length === 0) {
            // ... (event dispatch logic same)
            const newChatForSidebar = {
                id: chatId,
                userId: '',
                agentId: agent.id,
                projectId: null,
                createdAt: new Date(),
                updatedAt: new Date(),
                agent: agent
            };
            window.dispatchEvent(new CustomEvent('newChatCreated', { detail: newChatForSidebar }));
        }

        const aiMsgId = (Date.now() + 1).toString()
        const aiMsg: Message = {
            id: aiMsgId,
            role: "assistant",
            content: "",
            createdAt: new Date(),
        }
        setMessages((prev) => [...prev, aiMsg])

        setIsLoading(true)

        // Abort Controller Setup
        const controller = new AbortController()
        abortControllerRef.current = controller

            ; (async () => {
                try {
                    const response = await fetch(`/api/chat/${chatId}`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            message: userMessage,
                            attachments: currentAttachments
                        }),
                        signal: controller.signal // Pass signal
                    })

                    if (!response.ok) throw new Error(await response.text())

                    const reader = response.body?.getReader()
                    const decoder = new TextDecoder()
                    let fullContent = ""

                    if (reader) {
                        while (true) {
                            const { done, value } = await reader.read()
                            if (done) break

                            const chunk = decoder.decode(value, { stream: true })
                            fullContent += chunk

                            // Fix for "Incorrect line at end" -> remove trailing horizontal rules if they appear alone
                            const cleanedContent = fullContent.replace(/\n---\s*$/, '').replace(/\n_+\s*$/, '')

                            setMessages((prev) =>
                                prev.map((msg) =>
                                    msg.id === aiMsgId
                                        ? { ...msg, content: cleanedContent }
                                        : msg
                                )
                            )
                        }
                    }

                } catch (error: any) {
                    if (error.name === 'AbortError') {
                        console.log('Request aborted')
                        setMessages((prev) =>
                            prev.map((msg) =>
                                msg.id === aiMsgId
                                    ? { ...msg, content: msg.content + " [Остановлено]" }
                                    : msg
                            )
                        )
                    } else {
                        console.error("Failed to send message:", error)
                        setMessages((prev) =>
                            prev.map((msg) =>
                                msg.id === aiMsgId
                                    ? { ...msg, content: "Ошибка: не удалось получить ответ от AI" }
                                    : msg
                            )
                        )
                    }
                } finally {
                    setIsLoading(false)
                    abortControllerRef.current = null
                }
            })()
    }

    // ... (onSubmit, effects, regenerate remains same) ...
    const onSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        handleSendMessage(input)
    }

    useEffect(() => {
        if (initialInput && !hasAutoSubmittedRef.current && messages.length === 0) {
            hasAutoSubmittedRef.current = true
            handleSendMessage(initialInput)
            window.history.replaceState(null, '', window.location.pathname)
        }
    }, [initialInput, messages.length])

    const getLastUserMessage = () => {
        for (let i = messages.length - 1; i >= 0; i--) {
            if (messages[i].role === "user") {
                return messages[i].content
            }
        }
        return null
    }

    const handleRegenerate = () => {
        const lastUserMessage = getLastUserMessage()
        if (!lastUserMessage || isPending) return
        setInput(lastUserMessage)
        setTimeout(() => {
            const form = document.querySelector('form')
            if (form) form.dispatchEvent(new Event('submit', { bubbles: true }))
        }, 100)
    }

    // Submit feedback
    const handleSubmitFeedback = () => {
        if (!feedbackText.trim()) return
        console.log("Feedback for message:", feedbackMessageId, "Text:", feedbackText)
        toast.success("Спасибо за отзыв! Мы учтём ваши пожелания.")
        setFeedbackOpen(false)
        setFeedbackText("")
        setFeedbackMessageId(null)
    }

    const handleDislike = (messageId: string) => {
        setFeedbackMessageId(messageId)
        setFeedbackOpen(true)
    }

    const getDisplayContent = (content: string) => {
        if (content.startsWith('[ИНСТРУКЦИИ:')) {
            return content.replace(/^\[ИНСТРУКЦИИ:[\s\S]*?\]\n\n/, '')
        }
        return content
    }

    const isEmpty = messages.length === 0

    if (isEmpty) {
        return (
            <div className="flex h-full flex-col items-center justify-center p-4 relative">
                {/* Header Buttons (Top Right) */}
                <div className="absolute top-4 right-4 flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                        onClick={() => router.push(`/dashboard/agents/${agent.id}`)}
                        title="Все чаты агента"
                    >
                        <Icons.chevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                        onClick={() => router.push(`/dashboard/agents/${agent.id}`)}
                        title="Настройки агента"
                    >
                        <Icons.settings className="h-4 w-4" />
                    </Button>
                </div>

                <div className="flex flex-col items-center gap-6 max-w-2xl w-full -mt-20">
                    {/* Greeting / Logo */}
                    <div className="flex flex-col items-center gap-2 text-center">
                        <div className="p-3 mb-2 text-6xl">
                            {agentIcon ? (
                                <span>{agentIcon}</span>
                            ) : (
                                <Icons.bot className="h-16 w-16 text-muted-foreground/50" />
                            )}
                        </div>
                        <button
                            onClick={() => router.push(`/dashboard/agents/${agent.id}`)}
                            className="group relative z-10 transition-all hover:opacity-80"
                        >
                            <h2 className="text-2xl font-semibold text-zinc-900 dark:text-white group-hover:underline decoration-zinc-400 underline-offset-4">
                                {agentName}
                            </h2>
                        </button>
                        <p className="text-zinc-500 dark:text-zinc-200 text-sm">
                            Я готов помочь вам создать контент.
                        </p>
                    </div>

                    <div className="w-full">
                        <ChatInput
                            input={input}
                            setInput={setInput}
                            onSubmit={onSubmit}
                            isPending={isPending}
                            centered
                            onFileSelect={handleFileSelect}
                            onFileDrop={handleFileDrop}
                            attachments={attachments}
                            removeAttachment={removeAttachment}
                        />
                    </div>
                    {/* Action Chips */}
                    <div className="grid grid-cols-2 gap-3 w-full max-w-2xl">
                        {(
                            (agentName.toLowerCase().includes("headlines") || agentName.toLowerCase().includes("заголовки")) ?
                                [
                                    { emoji: "🔥", text: "Дай 10 заголовков" },
                                    { emoji: "💡", text: "Дай 10 на тему" },
                                ] :
                                (agentName.toLowerCase().includes("reels") && (agentName.toLowerCase().includes("description") || agentName.toLowerCase().includes("описание"))) ?
                                    [
                                        { emoji: "📝", text: "Дай 10" },
                                        { emoji: "🎯", text: "Дай 10 на тему" },
                                    ] :
                                    [
                                        { emoji: "📝", text: "Дай 10 вариантов описания" },
                                        { emoji: "🎯", text: "Дай 10 описаний на тему" },
                                        { emoji: "🎬", text: "Написать сценарий" },
                                        { emoji: "📊", text: "Анализ трендов" },
                                    ]
                        ).map((item) => (
                            <button
                                key={item.text}
                                onClick={() => {
                                    if (item.text.includes("на тему")) {
                                        setInput(item.text + " ")
                                    } else {
                                        handleSendMessage(item.text)
                                    }
                                }}
                                className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-100 bg-transparent border border-zinc-200 dark:border-zinc-700/60 rounded-xl px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-white transition-colors text-left"
                            >
                                <span>{item.emoji}</span>
                                <span>{item.text}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    return (
        <>
            {/* Header Buttons */}
            <div className="flex-none flex justify-end px-4 pt-4 gap-2">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                    onClick={() => router.push(`/dashboard/agents/${agent.id}`)}
                    title="Все чаты агента"
                >
                    <Icons.chevronLeft className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                    onClick={() => router.push(`/dashboard/agents/${agent.id}`)}
                    title="Настройки агента"
                >
                    <Icons.settings className="h-4 w-4" />
                </Button>
            </div>

            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
                <div className="mx-auto max-w-3xl px-4">
                    <div className="flex flex-col gap-6 py-6">
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={cn(
                                    "flex gap-3 items-start",
                                    msg.role === "user" && "justify-end"
                                )}
                            >
                                {msg.role === "assistant" && (
                                    agentIcon ? (
                                        <div className="h-6 w-6 shrink-0 flex items-center justify-center text-base">
                                            {agentIcon}
                                        </div>
                                    ) : (
                                        <div className="h-6 w-6 shrink-0 flex items-center justify-center text-base">
                                            🧠
                                        </div>
                                    )
                                )}

                                <div className={cn("flex flex-col gap-1.5 min-w-0", msg.role === "user" ? "max-w-[85%]" : "flex-1")}>
                                    {/* Attachments */}
                                    {msg.attachments && msg.attachments.length > 0 && (
                                        <div className={cn("flex flex-wrap gap-2 mb-1", msg.role === "user" ? "justify-end" : "justify-start")}>
                                            {msg.attachments.map((att: any, i: number) => (
                                                att.type?.startsWith('image/') ? (
                                                    <img key={i} src={att.url} alt={att.name} className="max-w-[200px] rounded-lg border border-zinc-200 dark:border-zinc-700" />
                                                ) : (
                                                    <div key={i} className="flex items-center gap-2 p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700">
                                                        <Icons.paperclip className="h-4 w-4 text-zinc-500" />
                                                        <span className="text-xs text-zinc-500 max-w-[150px] truncate">{att.name}</span>
                                                    </div>
                                                )
                                            ))}
                                        </div>
                                    )}

                                    <div
                                        className={cn(
                                            "text-[13px] leading-relaxed",
                                            msg.role === "user"
                                                ? "bg-[#F4F4F5] dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-2xl px-4 py-2.5 whitespace-pre-wrap"
                                                : "bg-transparent text-zinc-700 dark:text-zinc-300 prose prose-zinc dark:prose-invert prose-sm max-w-none [&>*:first-child]:mt-0 prose-p:my-1.5 prose-p:leading-relaxed prose-headings:my-2 prose-headings:mt-3 prose-headings:font-medium prose-headings:text-zinc-700 dark:prose-headings:text-zinc-300 prose-h1:text-base prose-h2:text-base prose-h3:text-sm prose-ul:my-1.5 prose-li:my-0.5 prose-strong:font-medium prose-strong:text-zinc-700 dark:prose-strong:text-zinc-300"
                                        )}
                                    >
                                        {msg.role === "user" ? (
                                            getDisplayContent(msg.content)
                                        ) : msg.content ? (() => {
                                            // Check if this is description agent
                                            const isDescAgent = agent && (agent.name.toLowerCase().includes("reels") && (agent.name.toLowerCase().includes("description") || agent.name.toLowerCase().includes("описание")))

                                            if (isDescAgent) {
                                                // Strip incomplete markers during streaming for cleaner display
                                                let cleanContent = msg.content
                                                    .replace(/【DESC】/g, '')  // Remove opening markers
                                                    .replace(/【\/DESC】/g, '') // Remove closing markers

                                                // Parse and render with inline counters (only for complete markers)
                                                const parts = msg.content.split(/(【DESC】[\s\S]*?【\/DESC】)/g)
                                                const hasCompleteMarkers = parts.some(p => /【DESC】[\s\S]*?【\/DESC】/.test(p))

                                                if (hasCompleteMarkers) {
                                                    return (
                                                        <>
                                                            {parts.map((part, idx) => {
                                                                const descMatch = part.match(/【DESC】([\s\S]*?)【\/DESC】/)
                                                                if (descMatch) {
                                                                    const descText = descMatch[1]
                                                                    // Count ALL characters including spaces, emojis, punctuation
                                                                    const charCount = [...descText].length
                                                                    return (
                                                                        <div key={idx} className="mb-4">
                                                                            <ReactMarkdown>{descText}</ReactMarkdown>
                                                                            <div className={cn(
                                                                                "text-[11px] font-medium mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full",
                                                                                charCount > 2200
                                                                                    ? "text-red-600 bg-red-50 dark:bg-red-900/30"
                                                                                    : charCount > 1800
                                                                                        ? "text-amber-600 bg-amber-50 dark:bg-amber-900/30"
                                                                                        : "text-green-600 bg-green-50 dark:bg-green-900/30"
                                                                            )}>
                                                                                📝 {charCount} / 2200
                                                                            </div>
                                                                        </div>
                                                                    )
                                                                }
                                                                // Regular text without markers - also strip any incomplete markers
                                                                const cleanPart = part.replace(/【DESC】/g, '').replace(/【\/DESC】/g, '')
                                                                return cleanPart ? <ReactMarkdown key={idx}>{cleanPart}</ReactMarkdown> : null
                                                            })}
                                                        </>
                                                    )
                                                }

                                                // No complete markers yet (still streaming) - show clean content
                                                return <ReactMarkdown>{cleanContent}</ReactMarkdown>
                                            }

                                            // Default rendering for non-description agents
                                            return <ReactMarkdown>{msg.content}</ReactMarkdown>
                                        })() : (
                                            <span className="flex items-center gap-1.5 text-zinc-400 h-6">
                                                <span className="inline-block w-2 h-2 bg-zinc-300 dark:bg-zinc-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                                <span className="inline-block w-2 h-2 bg-zinc-300 dark:bg-zinc-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                                <span className="inline-block w-2 h-2 bg-zinc-300 dark:bg-zinc-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                            </span>
                                        )}
                                    </div>


                                    {/* Action Bar */}
                                    <div className={cn("flex items-center gap-1", msg.role === "user" ? "justify-end -mr-2" : "-ml-2")}>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-muted-foreground/50 hover:text-muted-foreground"
                                            onClick={() => {
                                                navigator.clipboard.writeText(msg.content)
                                                toast.success("Скопировано")
                                            }}
                                        >
                                            <Icons.copy className="h-3.5 w-3.5" />
                                        </Button>

                                        {msg.role === "assistant" && msg.content && (
                                            <>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-muted-foreground/50 hover:text-muted-foreground"
                                                    onClick={() => toast.success("👍 Спасибо за оценку!")}
                                                >
                                                    <Icons.thumbsUp className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-muted-foreground/50 hover:text-muted-foreground"
                                                    onClick={() => handleDislike(msg.id)}
                                                >
                                                    <Icons.thumbsDown className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-muted-foreground/50 hover:text-muted-foreground"
                                                    onClick={handleRegenerate}
                                                    disabled={isPending}
                                                >
                                                    <Icons.refresh className="h-3.5 w-3.5" />
                                                </Button>
                                            </>
                                        )}
                                    </div>

                                </div>
                            </div>
                        ))}
                        <div ref={scrollRef} />
                    </div >
                </div >
            </div >

            <div className="flex-none bg-transparent p-4">
                <div className="mx-auto max-w-3xl px-4">
                    <ChatInput
                        input={input}
                        setInput={setInput}
                        onSubmit={(e) => {
                            if (isPending) {
                                e.preventDefault()
                                handleStop()
                            } else {
                                onSubmit(e)
                            }
                        }}
                        onStop={handleStop}
                        isPending={isPending}
                        onFileSelect={handleFileSelect}
                        onFileDrop={handleFileDrop}
                        attachments={attachments}
                        removeAttachment={removeAttachment}
                    />
                </div>
            </div>

            <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
                <DialogContent className="sm:max-w-md dark:bg-[#1a1a1a] dark:border-zinc-800">
                    <DialogHeader>
                        <DialogTitle className="dark:text-white">Что можно улучшить?</DialogTitle>
                        <DialogDescription className="dark:text-zinc-400">
                            Опишите, что было не так с ответом. Мы учтём ваш отзыв для улучшения.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="feedback" className="dark:text-zinc-300">
                                Ваш отзыв
                            </Label>
                            <Textarea
                                id="feedback"
                                value={feedbackText}
                                onChange={(e) => setFeedbackText(e.target.value)}
                                placeholder="Например: ответ был неточным, слишком длинным, не по теме..."
                                className="min-h-[100px] dark:bg-[#0f0f0f] dark:border-zinc-700 dark:text-white dark:placeholder:text-zinc-500"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setFeedbackOpen(false)}
                            className="dark:bg-transparent dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        >
                            Отмена
                        </Button>
                        <Button
                            onClick={handleSubmitFeedback}
                            disabled={!feedbackText.trim()}
                            className="dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                        >
                            Отправить
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
