"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
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
}

function ChatInput({ input, setInput, onSubmit, isPending, centered = false, onFileSelect, onFileDrop, attachments, removeAttachment }: ChatInputProps) {
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [isDragging, setIsDragging] = useState(false)

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
                                <img src={att.url} alt={att.name} className="h-16 w-16 object-cover" />
                            ) : (
                                <div className="h-16 w-16 flex items-center justify-center text-zinc-500">
                                    <Icons.paperclip className="h-6 w-6" />
                                </div>
                            )}
                            <button
                                type="button"
                                onClick={() => removeAttachment(i)}
                                className="absolute top-0.5 right-0.5 bg-black/50 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
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
            />

            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                multiple
                accept="image/*,application/pdf"
                onChange={onFileSelect}
            />

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg text-zinc-500 hover:bg-zinc-200/50 hover:text-zinc-700 -ml-1"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <Icons.add className="h-5 w-5" />
                    </Button>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        type="submit"
                        size="icon"
                        disabled={isPending || (!input.trim() && attachments.length === 0)}
                        className={cn(
                            "h-8 w-8 rounded-lg bg-[#D97757] text-white hover:bg-[#c56a4c] shrink-0 transition-opacity disabled:opacity-40 disabled:bg-zinc-200 disabled:text-zinc-400"
                        )}
                    >
                        <Icons.arrowUp className="h-4 w-4" />
                        <span className="sr-only">Отправить</span>
                    </Button>
                </div>
            </div>
        </form>
    )
}

export function ChatInterface({ chatId: initialChatId, initialMessages, agentName, agentIcon, agent, initialInput }: ChatInterfaceProps) {
    const router = useRouter()
    const [chatId, setChatId] = useState(initialChatId)
    // Update messages type to include attachments
    const [messages, setMessages] = useState<any[]>(initialMessages)
    const [input, setInput] = useState(initialInput || "")
    const [isLoading, setIsLoading] = useState(false)
    const [attachments, setAttachments] = useState<Attachment[]>([])

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
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            Array.from(e.target.files).forEach(file => {
                const reader = new FileReader()
                reader.onload = (e) => {
                    if (e.target?.result) {
                        setAttachments(prev => [...prev, {
                            name: file.name,
                            type: file.type,
                            url: e.target!.result as string
                        }])
                    }
                }
                reader.readAsDataURL(file)
            })
        }
    }

    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index))
    }

    const handleFileDrop = (files: FileList) => {
        Array.from(files).forEach(file => {
            if (file.type.startsWith('image/') || file.type === 'application/pdf') {
                const reader = new FileReader()
                reader.onload = (e) => {
                    if (e.target?.result) {
                        setAttachments(prev => [...prev, {
                            name: file.name,
                            type: file.type,
                            url: e.target!.result as string
                        }])
                    }
                }
                reader.readAsDataURL(file)
            }
        })
    }

    const handleSendMessage = async (content: string) => {
        if ((!content.trim() && attachments.length === 0) || isPending) return

        const userMessage = content.trim()
        const currentAttachments = [...attachments]

        // Optimistic UI
        const userMsg: any = {
            id: Date.now().toString(),
            role: "user",
            content: userMessage,
            createdAt: new Date(),
            attachments: currentAttachments
        }

        setMessages((prev) => [...prev, userMsg])
        setInput("")
        setAttachments([]) // Clear attachments
        isUserScrollingRef.current = false
        setShouldAutoScroll(true)

        // For first message: dispatch event to immediately add chat to sidebar
        if (initialMessages.length === 0 && messages.length === 0) {
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

        // Create placeholder for AI response
        const aiMsgId = (Date.now() + 1).toString()
        const aiMsg: Message = {
            id: aiMsgId,
            role: "assistant",
            content: "",
            createdAt: new Date(),
        }
        setMessages((prev) => [...prev, aiMsg])

        // Use regular async - don't block navigation
        setIsLoading(true)
            ; (async () => {
                try {
                    // Call streaming API
                    const response = await fetch(`/api/chat/${chatId}`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            message: userMessage,
                            attachments: currentAttachments
                        }),
                    })

                    if (!response.ok) {
                        throw new Error(await response.text())
                    }

                    // Read streaming response
                    const reader = response.body?.getReader()
                    const decoder = new TextDecoder()
                    let fullContent = ""

                    if (reader) {
                        while (true) {
                            const { done, value } = await reader.read()
                            if (done) break

                            const chunk = decoder.decode(value, { stream: true })
                            fullContent += chunk

                            // Update the AI message with accumulated content
                            setMessages((prev) =>
                                prev.map((msg) =>
                                    msg.id === aiMsgId
                                        ? { ...msg, content: fullContent }
                                        : msg
                                )
                            )
                            // NOTE: Do NOT set shouldAutoScroll here - respect user's scroll position
                        }
                    }

                } catch (error) {
                    console.error("Failed to send message:", error)
                    // Update AI message with error
                    setMessages((prev) =>
                        prev.map((msg) =>
                            msg.id === aiMsgId
                                ? { ...msg, content: "Ошибка: не удалось получить ответ от AI" }
                                : msg
                        )
                    )
                } finally {
                    setIsLoading(false)
                }
            })()
    }

    const onSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        handleSendMessage(input)
    }

    // Auto-submit effect
    useEffect(() => {
        if (initialInput && !hasAutoSubmittedRef.current && messages.length === 0) {
            hasAutoSubmittedRef.current = true
            handleSendMessage(initialInput)
            // Clear search params
            window.history.replaceState(null, '', window.location.pathname)
        }
    }, [initialInput, messages.length])

    // Find the last user message for regeneration
    const getLastUserMessage = () => {
        for (let i = messages.length - 1; i >= 0; i--) {
            if (messages[i].role === "user") {
                return messages[i].content
            }
        }
        return null
    }

    // Regenerate: resend the last user message as new message
    const handleRegenerate = () => {
        const lastUserMessage = getLastUserMessage()
        if (!lastUserMessage || isPending) return

        // Just resend the same message without deleting anything
        setInput(lastUserMessage)
        setTimeout(() => {
            const form = document.querySelector('form')
            if (form) form.dispatchEvent(new Event('submit', { bubbles: true }))
        }, 100)
    }

    // Submit feedback
    const handleSubmitFeedback = () => {
        if (!feedbackText.trim()) return

        // Here you could save to database
        console.log("Feedback for message:", feedbackMessageId, "Text:", feedbackText)
        toast.success("Спасибо за отзыв! Мы учтём ваши пожелания.")

        setFeedbackOpen(false)
        setFeedbackText("")
        setFeedbackMessageId(null)
    }

    // Open dislike dialog
    const handleDislike = (messageId: string) => {
        setFeedbackMessageId(messageId)
        setFeedbackOpen(true)
    }

    // Display Logic to hide Instructions
    const getDisplayContent = (content: string) => {
        if (content.startsWith('[ИНСТРУКЦИИ:')) {
            return content.replace(/^\[ИНСТРУКЦИИ:[\s\S]*?\]\n\n/, '')
        }
        return content
    }

    const isEmpty = messages.length === 0

    if (isEmpty) {
        return (
            <div className="flex h-full flex-col items-center justify-center p-4">
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
                        <h2 className="text-2xl font-semibold text-zinc-900 dark:text-white">
                            {agentName}
                        </h2>
                        <p className="text-zinc-500 dark:text-zinc-200 text-sm">
                            Я готов помочь вам создать контент.
                        </p>
                    </div>

                    {/* Centered Input */}
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

                    {/* Action Chips - No background, subtle border like chatlyai */}
                    <div className="grid grid-cols-2 gap-3 w-full max-w-2xl">
                        {(
                            (agentName.toLowerCase().includes("headlines") || agentName.toLowerCase().includes("заголовки")) ?
                                [
                                    { emoji: "🔥", text: "10 кликбейтных заголовков" },
                                    { emoji: "🧐", text: "Заголовки с интригой" },
                                    { emoji: "📉", text: "Анализ болей ЦА" },
                                    { emoji: "✍️", text: "Переписать скучные заголовки" },
                                ] :
                                [
                                    { emoji: "📝", text: "Создать пост для LinkedIn" },
                                    { emoji: "🎬", text: "Написать сценарий" },
                                    { emoji: "📊", text: "Анализ трендов" },
                                    { emoji: "💡", text: "Идеи для контента" },
                                ]
                        ).map((item) => (
                            <button
                                key={item.text}
                                onClick={() => setInput(item.text)}
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
            {/* Messages Area - The ONLY scrollable part */}
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
                                        ) : msg.content ? (
                                            <ReactMarkdown>
                                                {msg.content}
                                            </ReactMarkdown>
                                        ) : (
                                            <span className="flex items-center gap-1.5 text-zinc-400 h-6">
                                                <span className="inline-block w-2 h-2 bg-zinc-300 dark:bg-zinc-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                                <span className="inline-block w-2 h-2 bg-zinc-300 dark:bg-zinc-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                                <span className="inline-block w-2 h-2 bg-zinc-300 dark:bg-zinc-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                            </span>
                                        )}
                                    </div>

                                    {/* Claude-like Action Bar for AI */}
                                    {msg.role === "assistant" && msg.content && (
                                        <div className="flex items-center gap-1 -ml-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-muted-foreground/50 hover:text-muted-foreground"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(msg.content)
                                                    toast.success("Скопировано в буфер обмена")
                                                }}
                                            >
                                                <Icons.copy className="h-3.5 w-3.5" />
                                            </Button>
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
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        <div ref={scrollRef} />
                    </div>
                </div>
            </div>

            {/* Fixed Input Area at Bottom */}
            <div className="flex-none bg-transparent p-4">
                <div className="mx-auto max-w-3xl px-4">
                    <ChatInput
                        input={input}
                        setInput={setInput}
                        onSubmit={onSubmit}
                        isPending={isPending}
                        onFileSelect={handleFileSelect}
                        onFileDrop={handleFileDrop}
                        attachments={attachments}
                        removeAttachment={removeAttachment}
                    />
                </div>
            </div>

            {/* Feedback Dialog */}
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
