/**
 * ChatPanel Component - Chat interface with the AI agent.
 * 
 * SOLID Principle: Single Responsibility
 * - This component ONLY renders the chat UI
 * - Message handling and submission via props
 */

"use client"

import { useRef, useEffect } from "react"
import { Icons } from "@/components/shared/icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export interface Message {
    id: string
    role: "user" | "assistant"
    content: string
}

interface ChatPanelProps {
    messages: Message[]
    input: string
    isProcessing: boolean
    onInputChange: (value: string) => void
    onSubmit: (e: React.FormEvent) => void
}

export function ChatPanel({
    messages,
    input,
    isProcessing,
    onInputChange,
    onSubmit
}: ChatPanelProps) {
    const messagesEndRef = useRef<HTMLDivElement>(null)

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages])

    return (
        <div className="w-1/3 flex flex-col border rounded-lg bg-card">
            {/* Header */}
            <div className="p-4 border-b">
                <h2 className="font-semibold flex items-center gap-2">
                    <Icons.bot className="h-5 w-5" />
                    Master Agent (Real AI)
                </h2>
                <p className="text-xs text-muted-foreground flex items-center gap-2">
                    <StatusIndicator />
                    Connected to Claude 4.5
                </p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => (
                    <MessageBubble key={msg.id} message={msg} />
                ))}

                {isProcessing && <ThinkingIndicator />}

                <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={onSubmit} className="p-4 border-t">
                <div className="flex gap-2">
                    <Input
                        value={input}
                        onChange={(e) => onInputChange(e.target.value)}
                        placeholder="Например: Сделай 5 заголовков..."
                        disabled={isProcessing}
                    />
                    <Button type="submit" disabled={isProcessing}>
                        <Icons.send className="h-4 w-4" />
                    </Button>
                </div>
            </form>
        </div>
    )
}

// ==========================================
// Sub-components (KISS: simple, focused)
// ==========================================

function StatusIndicator() {
    return (
        <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
        </span>
    )
}

function MessageBubble({ message }: { message: Message }) {
    const isUser = message.role === "user"

    return (
        <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
            <div
                className={`max-w-[85%] rounded-lg px-4 py-2 ${isUser
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary"
                    }`}
            >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            </div>
        </div>
    )
}

function ThinkingIndicator() {
    return (
        <div className="flex justify-start">
            <div className="bg-secondary rounded-lg px-4 py-2 flex items-center gap-2">
                <Icons.spinner className="h-4 w-4 animate-spin" />
                <span className="text-xs">Думаю...</span>
            </div>
        </div>
    )
}
