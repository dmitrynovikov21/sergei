/**
 * Producer Page - Main content production interface.
 * 
 * SOLID Refactored:
 * - UI split into ChatPanel and ContentPlan components
 * - Business logic kept in page (could be extracted to hooks)
 * - Clean, readable structure
 */

"use client"

import { useState } from "react"
import { ChatPanel, ContentPlan, Message, Post } from "@/components/producer"
import {
    chatWithAgent,
    startBatch,
    approveHeadlines,
    approveScripts,
    startProduction
} from "@/app/actions/producer"

// ==========================================
// Types
// ==========================================

interface GeneratedPost extends Post {
    isNew?: boolean
    createdAt: number
}

// API response types
interface HeadlineItem {
    id: string
    headline: string
}

interface ScriptItem {
    headline: string
    caption: string
    reasoning: string
    hook_type?: string
}

// ==========================================
// Constants
// ==========================================

const WELCOME_MESSAGE: Message = {
    id: "welcome",
    role: "assistant",
    content: `👋 Привет! Я Master Agent — твой AI продюсер контента.

Я подключен к реальному мозгу (Claude 4.5). Скажи, что сделать:
• "Сделай 10 виральных заголовков"
• "Проанализируй тренды"

Это займёт время, так как я реально думаю!`
}

// ==========================================
// Main Component
// ==========================================

export default function ProducerPage() {
    // State
    const [posts, setPosts] = useState<GeneratedPost[]>([])
    const [currentBatchId, setCurrentBatchId] = useState<string | null>(null)
    const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE])
    const [input, setInput] = useState("")
    const [isProcessing, setIsProcessing] = useState(false)

    // ==========================================
    // Message Helpers
    // ==========================================

    const addMessage = (role: "user" | "assistant", content: string) => {
        const id = `${role}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        setMessages(prev => [...prev, { id, role, content }])
    }

    // ==========================================
    // Chat Handler
    // ==========================================

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!input.trim() || isProcessing) return

        addMessage("user", input.trim())
        setInput("")
        setIsProcessing(true)

        try {
            const response = await chatWithAgent(input, currentBatchId || undefined)

            if (response.reply) {
                addMessage("assistant", response.reply)
            }

            // Handle backend actions
            await handleAction(response.action, response.data)

        } catch (error) {
            console.error(error)
            addMessage("assistant", "❌ Произошла ошибка при связи с мозгом агента.")
        } finally {
            setIsProcessing(false)
        }
    }

    // ==========================================
    // Action Router
    // ==========================================

    const handleAction = async (action?: string, data?: Record<string, unknown>) => {
        switch (action) {
            case "start_batch":
                if (data?.id && data?.headlines) {
                    setCurrentBatchId(data.id as string)
                    setPosts(parseHeadlines(data.headlines as any[]))
                }
                break

            case "request_approval_ids":
                await handleGenerateScripts()
                break

            case "request_production_start":
                if (currentBatchId) {
                    await startProduction(currentBatchId)
                    addMessage("assistant", "🚀 Production pipeline started!")
                }
                break
        }
    }

    // ==========================================
    // Business Logic Handlers
    // ==========================================

    const handleGenerateScripts = async () => {
        if (!currentBatchId) {
            addMessage("assistant", "⚠️ Сначала нужно создать партию заголовков!")
            return
        }

        const approvedIds = posts.filter(p => p.status === "approved").map(p => p.id)

        if (approvedIds.length === 0) {
            addMessage("assistant", "⚠️ Выбери хотя бы один заголовок!")
            return
        }

        addMessage("assistant", `✍️ Пишу скрипты для ${approvedIds.length} постов...`)

        try {
            const batch = await approveHeadlines(currentBatchId, approvedIds)
            setPosts(prev => mergeScripts(prev, batch.scripts))
            addMessage("assistant", "✅ Скрипты готовы! Напиши 'сделай видео' для продакшна.")
        } catch (error) {
            addMessage("assistant", `❌ Ошибка: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    const handleTogglePost = (postId: string) => {
        setPosts(prev => prev.map(post =>
            post.id === postId
                ? { ...post, status: post.status === "approved" ? "pending" : "approved" }
                : post
        ))
    }

    // ==========================================
    // Render
    // ==========================================

    return (
        <div className="flex h-[calc(100vh-4rem)] gap-4 p-4">
            <ChatPanel
                messages={messages}
                input={input}
                isProcessing={isProcessing}
                onInputChange={setInput}
                onSubmit={handleSubmit}
            />

            <ContentPlan
                posts={posts}
                onTogglePost={handleTogglePost}
            />
        </div>
    )
}

// ==========================================
// Helper Functions (Pure, testable)
// ==========================================

function parseHeadlines(headlines: HeadlineItem[]): GeneratedPost[] {
    return headlines.map(hl => ({
        id: hl.id,
        headline: hl.headline,
        caption: "",
        reasoning: "",
        status: "pending" as const,
        hookType: "viral",
        isNew: true,
        createdAt: Date.now()
    }))
}

function mergeScripts(posts: GeneratedPost[], scripts: ScriptItem[]): GeneratedPost[] {
    return posts.map(post => {
        const script = scripts.find(s => s.headline === post.headline)
        if (script) {
            return {
                ...post,
                caption: script.caption,
                reasoning: script.reasoning,
                hookType: script.hook_type
            }
        }
        return post
    })
}
