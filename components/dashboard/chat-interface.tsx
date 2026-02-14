"use client"

import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import ReactMarkdown from "react-markdown"
import { saveMessage } from "@/actions/chat"
import { getDatasets } from "@/actions/datasets"
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

import { ChatInput } from "./chat/chat-input"
import { ChatMessage } from "./chat/chat-message"
import type { Attachment, Message } from "./chat/types"
import { useFileUpload } from "@/hooks/use-file-upload"
import { CreditBlockModal } from "@/components/chat/credit-block-modal"
import { SubscriptionRequiredModal } from "@/components/chat/subscription-required-modal"
import type { TariffPlan } from "@/lib/billing-config"
import {
    parseSSELine,
    extractStatusFromReasoning,
    buildDisplayContent,
    extractLinesFromBuffer
} from "@/lib/utils/stream-parser"



interface ChatInterfaceProps {
    chatId?: string // Optional for new chats
    initialMessages: Message[]
    agentName: string
    agentIcon?: string | null
    agent: Agent
    initialInput?: string // New prop
    initialDatasetId?: string | null // Dataset selected when chat was created
    userName?: string // User name for greeting
}

export function ChatInterface({ chatId: initialChatId, initialMessages, agentName, agentIcon, agent, initialInput, initialDatasetId, userName = "there" }: ChatInterfaceProps) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [chatId, setChatId] = useState(initialChatId)
    // Initialize messages: use initialMessages from DB, or empty for new chats
    const [messages, setMessages] = useState<any[]>(() => {
        if (initialMessages && initialMessages.length > 0) return initialMessages
        return []
    })
    const [input, setInput] = useState("")
    const [isLoading, setIsLoading] = useState(false)

    // Dataset selector state
    const [datasets, setDatasets] = useState<{ id: string, name: string }[]>([])
    const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(null)

    // Get greeting based on time of day
    const getGreeting = useCallback(() => {
        const hour = new Date().getHours()

        if (hour < 12) return `Доброе утро`
        if (hour < 17) return `Добрый день`
        return `Добрый вечер`
    }, [])

    // Parse initial attachments from sessionStorage (moved from URL to avoid 414)
    const initialAttachments = useMemo(() => {
        if (typeof window === 'undefined') return []

        const storageKey = `chat_attachments_${initialChatId}`
        const stored = sessionStorage.getItem(storageKey)
        if (stored) {
            try {
                const parsed = JSON.parse(stored)
                // Clean up after reading
                sessionStorage.removeItem(storageKey)
                return parsed
            } catch (e) {
                console.error("Failed to parse attachments from storage", e)
                return []
            }
        }
        return []
    }, [initialChatId])

    const { attachments, uploadFile, removeAttachment, clearAttachments, setAttachments } = useFileUpload()

    // Set initial attachments from sessionStorage
    useEffect(() => {
        if (initialAttachments.length > 0) {
            setAttachments(initialAttachments)
        }
    }, [initialAttachments, setAttachments])

    // Load datasets on mount
    useEffect(() => {
        getDatasets().then(data => {
            setDatasets(data.map(d => ({ id: d.id, name: d.name })))
        }).catch(console.error)
    }, [])

    // Initialize selectedDatasetId: chat's dataset takes priority over agent's default
    const datasetInitializedRef = useRef(false)
    useEffect(() => {
        // Priority: chat's saved dataset > agent's default dataset
        const effectiveDatasetId = initialDatasetId || agent.datasetId
        if (effectiveDatasetId && !selectedDatasetId) {
            setSelectedDatasetId(effectiveDatasetId)
        }
        datasetInitializedRef.current = true
    }, [initialDatasetId, agent.datasetId])

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

    // Credit block modal state
    const [creditBlockOpen, setCreditBlockOpen] = useState(false)

    // Subscription modal state
    const [subscriptionModalOpen, setSubscriptionModalOpen] = useState(false)
    const [subscriptionModalPlan, setSubscriptionModalPlan] = useState<TariffPlan | null>(null)
    const [subscriptionModalType, setSubscriptionModalType] = useState<'SUBSCRIPTION_REQUIRED' | 'CREDITS_EXHAUSTED'>('SUBSCRIPTION_REQUIRED')

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

    // File handlers (using useFileUpload hook)

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            Array.from(e.target.files).forEach(uploadFile)
        }
        // Reset input
        e.target.value = ''
    }

    // removeAttachment is now provided by useFileUpload hook

    const handleFileDrop = (files: FileList) => {
        Array.from(files).forEach(file => {
            uploadFile(file)
        })
    }

    // ... (imports remain)

    const abortControllerRef = useRef<AbortController | null>(null)

    // Track last user message for restore on stop
    const lastUserMessageRef = useRef<{ content: string, attachments: Attachment[] } | null>(null)

    // Handle Stop - abort stream, keep partial AI response visible
    const handleStop = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
            abortControllerRef.current = null
            setIsLoading(false)

            // Keep partial AI response, just mark as stopped (if content exists)
            // If AI message is still just thinking placeholder, remove it
            setMessages(prev => {
                const lastMsg = prev[prev.length - 1]
                if (lastMsg && lastMsg.role === 'assistant') {
                    // Check if it's just the thinking placeholder with no real content
                    const hasRealContent = lastMsg.content &&
                        !lastMsg.content.startsWith('<thinking>') &&
                        lastMsg.content.trim().length > 0
                    if (!hasRealContent) {
                        return prev.slice(0, -1) // Remove empty/thinking-only AI msg
                    }
                    // Keep partial content with stop marker
                    return prev.map(msg =>
                        msg.id === lastMsg.id
                            ? { ...msg, content: msg.content + '\n\n[Остановлено]' }
                            : msg
                    )
                }
                return prev
            })
            lastUserMessageRef.current = null
        }
    }

    const handleSendMessage = async (content: string, specificAttachments?: Attachment[]) => {
        // If specificAttachments provided, allow sending even if input is empty (re-send case) -> actually logic below handles it: `attachments` might be empty.
        // We need to check prioritized attachments.

        const currentAttachments = specificAttachments ? [...specificAttachments] : [...attachments]

        if ((!content.trim() && currentAttachments.length === 0) || isPending) return

        const userMessage = content.trim()

        const userMsg: Message = {
            id: Date.now().toString(),
            role: "user",
            content: userMessage,
            createdAt: new Date(),
            attachments: currentAttachments
        }

        setMessages((prev) => [...prev, userMsg])

        // Store user message for potential restore on stop
        lastUserMessageRef.current = { content: userMessage, attachments: currentAttachments }

        // Only clear input/attachments if it was a NEW message (not a resend)
        if (!specificAttachments) {
            setInput("")
            clearAttachments()
        }

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
            content: `<thinking>{"status":"Думаю...","full":""}</thinking>`,
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
                            attachments: currentAttachments, // Use the local variable, not state
                            datasetId: selectedDatasetId ?? initialDatasetId ?? agent.datasetId ?? null // Pass selected dataset to AI, with fallback for first-render race
                        }),
                        signal: controller.signal // Pass signal
                    })

                    // Handle 403 Subscription Required
                    if (response.status === 403) {
                        const errorData = await response.json()
                        if (errorData.error === 'SUBSCRIPTION_REQUIRED') {
                            setSubscriptionModalPlan(errorData.requiredPlan)
                            setSubscriptionModalType('SUBSCRIPTION_REQUIRED')
                            setSubscriptionModalOpen(true)
                            setMessages((prev) => prev.filter(msg => msg.id !== aiMsgId))
                            setIsLoading(false)
                            return
                        }
                    }

                    // Handle 402 Payment Required - user is blocked or credits exhausted
                    if (response.status === 402) {
                        const errorData = await response.json()
                        if (errorData.error === 'CREDITS_BLOCKED') {
                            setCreditBlockOpen(true)
                            setMessages((prev) => prev.filter(msg => msg.id !== aiMsgId))
                            setIsLoading(false)
                            return
                        }
                        if (errorData.error === 'CREDITS_EXHAUSTED') {
                            setSubscriptionModalPlan(errorData.requiredPlan)
                            setSubscriptionModalType('CREDITS_EXHAUSTED')
                            setSubscriptionModalOpen(true)
                            setMessages((prev) => prev.filter(msg => msg.id !== aiMsgId))
                            setIsLoading(false)
                            return
                        }
                    }

                    if (!response.ok) throw new Error(await response.text())

                    const reader = response.body?.getReader()
                    const decoder = new TextDecoder()
                    let fullContent = ""

                    if (reader) {
                        let fullText = ""
                        let fullReasoning = ""
                        let buffer = ""
                        let lastStatus = ""
                        let lastStatusUpdate = 0

                        while (true) {
                            const { done, value } = await reader.read()
                            if (done) break

                            buffer += decoder.decode(value, { stream: true })
                            const [lines, remaining] = extractLinesFromBuffer(buffer)
                            buffer = remaining

                            // Process each complete line
                            for (const line of lines) {
                                const chunk = parseSSELine(line)
                                if (!chunk) continue

                                if (chunk.type === 'text-delta') {
                                    fullText += chunk.content || ''
                                } else if (chunk.type === 'reasoning-delta') {
                                    fullReasoning += chunk.content || ''
                                } else if (chunk.type === 'tool-call') {
                                    lastStatus = `Вызываю ${chunk.toolName}...`
                                    lastStatusUpdate = Date.now()
                                } else if (chunk.type === 'tool-result') {
                                    lastStatus = "Анализирую данные..."
                                    lastStatusUpdate = Date.now()
                                }
                            }

                            // Update status from reasoning (throttled to 1s)
                            const now = Date.now()
                            if (fullReasoning && (now - lastStatusUpdate > 1000)) {
                                const extracted = extractStatusFromReasoning(fullReasoning)
                                if (extracted) {
                                    lastStatus = extracted
                                    lastStatusUpdate = now
                                }
                            }

                            // Build and update display content
                            const cleanedContent = buildDisplayContent(fullText, fullReasoning, lastStatus)

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
                        setMessages((prev) =>
                            prev.map((msg) =>
                                msg.id === aiMsgId
                                    ? { ...msg, content: msg.content + "\n\n[Остановлено]" }
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
        // Wait for initialAttachments to be loaded into attachments state
        const hasInitialAttachments = initialAttachments.length > 0
        const attachmentsReady = !hasInitialAttachments || attachments.length === initialAttachments.length

        if (initialInput && !hasAutoSubmittedRef.current && messages.length === 0 && attachmentsReady) {
            hasAutoSubmittedRef.current = true
            handleSendMessage(initialInput)
            window.history.replaceState(null, '', window.location.pathname)
        }
    }, [initialInput, messages.length, attachments.length, initialAttachments.length])

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
        // TODO: Save feedback to database
        toast.success("Спасибо за отзыв! Мы учтём ваши пожелания.")
        setFeedbackOpen(false)
        setFeedbackText("")
        setFeedbackMessageId(null)
    }

    const handleDislike = (messageId: string) => {
        setFeedbackMessageId(messageId)
        setFeedbackOpen(true)
    }

    const handleLike = (messageId: string) => {
        toast.success("Спасибо за оценку!")
        // TODO: Save to DB
    }



    const isEmpty = messages.length === 0

    if (isEmpty) {
        return (
            <div className="flex h-full flex-col items-center justify-center p-4 relative">


                <div className="flex flex-col items-center gap-6 max-w-2xl w-full -mt-20">
                    {/* Greeting / Logo */}
                    <div className="flex flex-col items-center gap-2 text-center">
                        <h1 className="greeting-text text-3xl text-foreground flex items-center gap-3">
                            <span className="text-accent">❋</span>
                            {getGreeting()}, {userName}
                        </h1>
                        <p className="text-muted-foreground text-sm">
                            Чем могу помочь?
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
                            datasets={datasets}
                            selectedDatasetId={selectedDatasetId}
                            onDatasetChange={setSelectedDatasetId}
                        />
                    </div>
                    {/* Action Chips */}
                    <div className="grid grid-cols-2 gap-3 w-full max-w-2xl">
                        {(
                            (agentName.toLowerCase().includes("headlines") || agentName.toLowerCase().includes("заголовки")) ?
                                [
                                    { text: "Придумай заголовки для Reels" },
                                    { text: "Заголовки на тему" },
                                ] :
                                (agentName.toLowerCase().includes("reels") && (agentName.toLowerCase().includes("description") || agentName.toLowerCase().includes("описание"))) ?
                                    [
                                        { text: "Написать сценарий" },
                                        { text: "Анализ трендов" },
                                    ] :
                                    [
                                        { text: "Написать сценарий" },
                                        { text: "Анализ трендов" },
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
                                className="text-sm text-muted-foreground bg-transparent border border-border rounded-xl px-4 py-3 hover:bg-muted hover:text-foreground transition-colors text-left"
                            >
                                {item.text}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">

            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
                {/* Sticky header - transparent, text flows under */}
                <div className="sticky top-0 z-10 px-4 py-2 bg-transparent">
                    <div className="flex flex-col">
                        <Link
                            href={`/dashboard/agents/${agent.id}`}
                            className="text-sm font-medium text-foreground hover:bg-[#141413]/95 hover:text-white rounded px-2 py-0.5 transition-all duration-200 w-fit"
                        >
                            {agentName}
                        </Link>

                    </div>
                </div>
                <div className="mx-auto max-w-3xl px-4 pb-32">
                    <div className="flex flex-col gap-6">
                        {messages.map((msg) => (
                            <ChatMessage
                                key={msg.id}
                                msg={msg}
                                agent={agent}
                                agentIcon={agentIcon}
                                isPending={isPending}
                                onResend={handleSendMessage}
                                onRegenerate={handleRegenerate}
                                onLike={handleLike}
                                onDislike={handleDislike}
                                onCopy={(content) => {
                                    navigator.clipboard.writeText(content)
                                    toast.success("Скопировано!")
                                }}
                            />
                        ))}
                        <div ref={scrollRef} />
                    </div >
                </div >
            </div >

            {/* Fixed bottom - absolute so content scrolls under */}
            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-background via-background/95 to-transparent pt-8">
                <div className="mx-auto max-w-3xl px-4">
                    {/* Quick Actions - Ещё / Дай другие */}
                    {messages.length > 0 && !isLoading && (
                        <div className="flex justify-center gap-3 mb-2">
                            <button
                                type="button"
                                onClick={() => handleSendMessage("Дай другой вариант")}
                                className="px-5 py-2 text-sm font-medium text-muted-foreground bg-muted border border-border rounded-full hover:text-foreground hover:border-foreground/30 transition-colors"
                            >
                                Дай другой вариант
                            </button>
                            <button
                                type="button"
                                onClick={() => handleSendMessage("Сократи на 200 символов")}
                                className="px-5 py-2 text-sm font-medium text-muted-foreground bg-muted border border-border rounded-full hover:text-foreground hover:border-foreground/30 transition-colors"
                            >
                                Сократи на 200 символов
                            </button>
                        </div>
                    )}
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
                        datasets={datasets}
                        selectedDatasetId={selectedDatasetId}
                        onDatasetChange={setSelectedDatasetId}
                    />
                </div>
            </div>

            <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
                <DialogContent className="sm:max-w-md bg-card border-border">
                    <DialogHeader>
                        <DialogTitle className="text-foreground">Что можно улучшить?</DialogTitle>
                        <DialogDescription className="text-muted-foreground">
                            Опишите, что было не так с ответом. Мы учтём ваш отзыв для улучшения.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="feedback" className="text-foreground">
                                Ваш отзыв
                            </Label>
                            <Textarea
                                id="feedback"
                                value={feedbackText}
                                onChange={(e) => setFeedbackText(e.target.value)}
                                placeholder="Например: ответ был неточным, слишком длинным, не по теме..."
                                className="min-h-[100px] bg-background border-border text-foreground placeholder:text-muted-foreground"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setFeedbackOpen(false)}
                            className="bg-transparent border-border text-foreground hover:bg-muted"
                        >
                            Отмена
                        </Button>
                        <Button
                            onClick={handleSubmitFeedback}
                            disabled={!feedbackText.trim()}
                            className="bg-accent text-accent-foreground hover:bg-accent/90"
                        >
                            Отправить
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <CreditBlockModal
                isOpen={creditBlockOpen}
                onClose={() => setCreditBlockOpen(false)}
            />

            <SubscriptionRequiredModal
                isOpen={subscriptionModalOpen}
                onClose={() => setSubscriptionModalOpen(false)}
                requiredPlan={subscriptionModalPlan}
                errorType={subscriptionModalType}
            />
        </div>
    )
}
