"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { X, Trash2, FileText } from "lucide-react"
import { useHeadlineBasket } from "./headline-basket-context"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

// Agent ID for "Описание Reels"
const DESC_AGENT_ID = "cmkpetsp700034o2v1o755wd8"

export function HeadlineBasketWidget() {
    const { headlines, removeHeadline, clearAll, count } = useHeadlineBasket()
    const [isOpen, setIsOpen] = useState(false)
    const [position, setPosition] = useState({ x: -1, y: -1 })
    const [isDragging, setIsDragging] = useState(false)
    const dragOffset = useRef({ x: 0, y: 0 })
    const widgetRef = useRef<HTMLDivElement>(null)
    const router = useRouter()

    // Initialize position on mount (bottom-right)
    useEffect(() => {
        if (position.x === -1) {
            setPosition({
                x: window.innerWidth - 80,
                y: window.innerHeight - 120,
            })
        }
    }, [position.x])

    // Drag handlers
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (widgetRef.current) {
            setIsDragging(true)
            dragOffset.current = {
                x: e.clientX - position.x,
                y: e.clientY - position.y,
            }
            e.preventDefault()
        }
    }, [position])

    useEffect(() => {
        if (!isDragging) return

        const handleMouseMove = (e: MouseEvent) => {
            setPosition({
                x: Math.max(0, Math.min(window.innerWidth - 56, e.clientX - dragOffset.current.x)),
                y: Math.max(0, Math.min(window.innerHeight - 56, e.clientY - dragOffset.current.y)),
            })
        }

        const handleMouseUp = () => {
            setIsDragging(false)
        }

        window.addEventListener("mousemove", handleMouseMove)
        window.addEventListener("mouseup", handleMouseUp)
        return () => {
            window.removeEventListener("mousemove", handleMouseMove)
            window.removeEventListener("mouseup", handleMouseUp)
        }
    }, [isDragging])

    // Touch drag handlers
    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        const touch = e.touches[0]
        setIsDragging(true)
        dragOffset.current = {
            x: touch.clientX - position.x,
            y: touch.clientY - position.y,
        }
    }, [position])

    useEffect(() => {
        if (!isDragging) return

        const handleTouchMove = (e: TouchEvent) => {
            const touch = e.touches[0]
            setPosition({
                x: Math.max(0, Math.min(window.innerWidth - 56, touch.clientX - dragOffset.current.x)),
                y: Math.max(0, Math.min(window.innerHeight - 56, touch.clientY - dragOffset.current.y)),
            })
        }

        const handleTouchEnd = () => setIsDragging(false)

        window.addEventListener("touchmove", handleTouchMove)
        window.addEventListener("touchend", handleTouchEnd)
        return () => {
            window.removeEventListener("touchmove", handleTouchMove)
            window.removeEventListener("touchend", handleTouchEnd)
        }
    }, [isDragging])

    // "Сделать описания" handler
    const handleMakeDescriptions = async () => {
        if (count === 0) return

        const headlinesList = headlines.map((h, i) => `${i + 1}. ${h}`).join("\n")
        const message = `Сделай описания для этих заголовков:\n\n${headlinesList}`

        try {
            // Create a new chat and navigate
            const res = await fetch("/api/chat/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    agentId: DESC_AGENT_ID,
                    initialMessage: message,
                }),
            })

            if (res.ok) {
                const data = await res.json()
                clearAll()
                setIsOpen(false)
                router.push(`/dashboard/chat/${data.chatId}`)
                toast.success(`Создан чат с ${count} заголовками для описаний`)
            } else {
                // Fallback: navigate to agent page with message in query
                clearAll()
                setIsOpen(false)
                router.push(`/dashboard/agents/${DESC_AGENT_ID}?input=${encodeURIComponent(message)}`)
                toast.success("Перенаправлен в агент описаний")
            }
        } catch {
            // Ultimate fallback: copy and navigate
            navigator.clipboard.writeText(headlinesList)
            clearAll()
            setIsOpen(false)
            router.push(`/dashboard/agents/${DESC_AGENT_ID}`)
            toast.success("Заголовки скопированы. Вставьте в чат с агентом описаний.")
        }
    }

    if (count === 0 && !isOpen) return null

    return (
        <>
            {/* Floating Dot */}
            <div
                ref={widgetRef}
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
                onClick={() => {
                    if (!isDragging) setIsOpen(prev => !prev)
                }}
                className={cn(
                    "fixed z-50 cursor-grab active:cursor-grabbing select-none",
                    "w-14 h-14 rounded-full flex items-center justify-center",
                    "bg-gradient-to-br from-violet-500 to-indigo-600",
                    "shadow-lg shadow-violet-500/30",
                    "transition-transform duration-200",
                    !isDragging && "hover:scale-110",
                    !isDragging && count > 0 && "animate-pulse-slow"
                )}
                style={{
                    left: `${position.x}px`,
                    top: `${position.y}px`,
                }}
                title={`Корзина: ${count} заголовков`}
            >
                <span className="text-white font-bold text-lg">{count}</span>

                {/* Pulse ring */}
                {count > 0 && !isOpen && (
                    <span className="absolute inset-0 rounded-full bg-violet-400/40 animate-ping" style={{ animationDuration: "2s" }} />
                )}
            </div>

            {/* Basket Panel */}
            {isOpen && (
                <div
                    className="fixed z-[60] w-96 max-h-[70vh] bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-700 overflow-hidden flex flex-col"
                    style={{
                        left: `${Math.min(position.x - 160, window.innerWidth - 400)}px`,
                        top: `${Math.max(20, position.y - 400)}px`,
                    }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
                        <h3 className="font-semibold text-sm">Корзина заголовков ({count})</h3>
                        <div className="flex items-center gap-1">
                            {count > 0 && (
                                <button
                                    onClick={() => { clearAll(); toast.success("Корзина очищена") }}
                                    className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                                    title="Очистить всё"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            )}
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    {/* Headlines List */}
                    <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800">
                        {count === 0 ? (
                            <div className="p-6 text-center text-zinc-400 text-sm">
                                Нажмите на точку возле заголовка, чтобы добавить его сюда
                            </div>
                        ) : (
                            headlines.map((headline, idx) => (
                                <div key={idx} className="group flex items-start gap-2 px-4 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                                    <span className="text-xs text-zinc-400 font-mono mt-0.5 shrink-0">{idx + 1}.</span>
                                    <p className="flex-1 text-sm text-zinc-700 dark:text-zinc-300 leading-snug">{headline}</p>
                                    <button
                                        onClick={() => removeHeadline(idx)}
                                        className="opacity-0 group-hover:opacity-100 p-1 rounded text-zinc-300 hover:text-rose-500 transition-all shrink-0"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    {count > 0 && (
                        <div className="px-4 py-3 border-t border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
                            <button
                                onClick={handleMakeDescriptions}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 text-white font-medium text-sm hover:from-violet-600 hover:to-indigo-700 transition-all shadow-sm"
                            >
                                <FileText className="h-4 w-4" />
                                Сделать описания ({count})
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Custom animation */}
            <style jsx>{`
                @keyframes pulse-slow {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                }
                .animate-pulse-slow {
                    animation: pulse-slow 3s ease-in-out infinite;
                }
            `}</style>
        </>
    )
}
