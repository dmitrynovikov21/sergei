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

    // Check if this is the "Description" agent or "Headlines Carousel" agent
    const isDescriptionAgent = agent.name.toLowerCase().includes("описание") || agent.name.toLowerCase().includes("description")
    const isHeadlinesCarouselAgent = agent.name.toLowerCase().includes("заголовки каруселей") || agent.name.toLowerCase().includes("carousel headlines")

    const handleStartChat = async (messageOverride?: string) => {
        const messageToSend = messageOverride || input
        if (!messageToSend.trim()) return

        try {
            setIsLoading(true)
            const chatId = await createChat(agent.id)

            // Instructions are now added server-side in the chat API route
            // based on agent settings (useEmoji, useSubscribe, etc.)

            router.push(`/dashboard/chat/${chatId}?init=${encodeURIComponent(messageToSend)}`)
        } catch (error) {
            console.error(error)
            toast.error("Не удалось создать чат")
            setIsLoading(false)
        }
    }

    // Quick action buttons only for "Заголовки Каруселей"
    const quickActions = isHeadlinesCarouselAgent
        ? [
            { text: "Дай мне 10 заголовков", emoji: "🔥" },
            { text: "Дай 10 заголовков на тему", emoji: "💡" }
        ]
        : []

    return (
        <div className="space-y-4">
            {/* Chat Input Box - Textarea and button side by side */}
            <div className="bg-zinc-100 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 flex">
                {/* Textarea - Full height */}
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

                {/* Send Button - Bottom right corner */}
                <div className="flex items-end p-3">
                    <button
                        onClick={() => handleStartChat()}
                        disabled={isLoading || !input.trim()}
                        className={cn(
                            "p-2.5 rounded-lg transition-all",
                            input.trim()
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
