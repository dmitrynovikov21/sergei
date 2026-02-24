"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { X, Trash2, FileText } from "lucide-react"
import { useHeadlineBasket } from "./headline-basket-context"
import { useStartChat } from "@/hooks/use-start-chat"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

// Agent ID for "Описание Reels"
const DESC_AGENT_ID = "cmkpetsp700034o2v1o755wd8"

export function HeadlineBasketWidget() {
    const { headlines, removeHeadline, clearAll, count } = useHeadlineBasket()
    const { startChat } = useStartChat()
    const [isOpen, setIsOpen] = useState(false)
    const [position, setPosition] = useState({ x: -1, y: -1 })
    const [isDragging, setIsDragging] = useState(false)
    const [hasDragged, setHasDragged] = useState(false)
    const dragOffset = useRef({ x: 0, y: 0 })
    const widgetRef = useRef<HTMLDivElement>(null)
    const panelRef = useRef<HTMLDivElement>(null)

    // Initialize position on mount (bottom-right)
    useEffect(() => {
        if (position.x === -1) {
            setPosition({
                x: window.innerWidth - 70,
                y: window.innerHeight - 100,
            })
        }
    }, [position.x])

    // Close on click outside
    useEffect(() => {
        if (!isOpen) return
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Node
            if (
                panelRef.current && !panelRef.current.contains(target) &&
                widgetRef.current && !widgetRef.current.contains(target)
            ) {
                setIsOpen(false)
            }
        }
        setTimeout(() => document.addEventListener("mousedown", handleClickOutside), 50)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [isOpen])

    // Drag handlers
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (widgetRef.current) {
            setIsDragging(true)
            setHasDragged(false)
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
            setHasDragged(true)
            setPosition({
                x: Math.max(0, Math.min(window.innerWidth - 48, e.clientX - dragOffset.current.x)),
                y: Math.max(0, Math.min(window.innerHeight - 48, e.clientY - dragOffset.current.y)),
            })
        }
        const handleMouseUp = () => setIsDragging(false)
        window.addEventListener("mousemove", handleMouseMove)
        window.addEventListener("mouseup", handleMouseUp)
        return () => {
            window.removeEventListener("mousemove", handleMouseMove)
            window.removeEventListener("mouseup", handleMouseUp)
        }
    }, [isDragging])

    // Touch drag
    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        const touch = e.touches[0]
        setIsDragging(true)
        setHasDragged(false)
        dragOffset.current = {
            x: touch.clientX - position.x,
            y: touch.clientY - position.y,
        }
    }, [position])

    useEffect(() => {
        if (!isDragging) return
        const handleTouchMove = (e: TouchEvent) => {
            setHasDragged(true)
            const touch = e.touches[0]
            setPosition({
                x: Math.max(0, Math.min(window.innerWidth - 48, touch.clientX - dragOffset.current.x)),
                y: Math.max(0, Math.min(window.innerHeight - 48, touch.clientY - dragOffset.current.y)),
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

    // "Сделать описания" — use the same flow as starting a chat from agent page
    const handleMakeDescriptions = () => {
        if (count === 0) return
        const headlinesList = headlines.map((h, i) => `${i + 1}. ${h}`).join("\n")
        const message = `Сделай описания для каждого заголовка по одному:\n\n${headlinesList}`

        clearAll()
        setIsOpen(false)
        toast.success(`Создаю описания для ${count} заголовков...`)

        // Uses the same startChat hook that agent pages use
        // This creates a real chat and navigates with ?init= param
        // so ChatInterface auto-sends the message and AI processes it
        startChat(DESC_AGENT_ID, { initialMessage: message })
    }

    if (count === 0 && !isOpen) return null

    return (
        <>
            {/* Floating Dot — dark theme, orange glow */}
            <div
                ref={widgetRef}
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
                onClick={() => {
                    if (!hasDragged) setIsOpen(prev => !prev)
                }}
                className={cn(
                    "fixed z-50 cursor-grab active:cursor-grabbing select-none",
                    "w-12 h-12 rounded-full flex items-center justify-center",
                    "bg-zinc-900 border border-zinc-700",
                    "shadow-[0_0_15px_rgba(245,158,11,0.3)]",
                    "transition-transform duration-200",
                    !isDragging && "hover:scale-110 hover:shadow-[0_0_20px_rgba(245,158,11,0.5)]",
                )}
                style={{
                    left: `${position.x}px`,
                    top: `${position.y}px`,
                }}
                title={`Корзина: ${count} заголовков`}
            >
                <span className="text-amber-500 font-bold text-sm">{count}</span>

                {/* Subtle pulse ring */}
                {count > 0 && !isOpen && (
                    <span
                        className="absolute inset-0 rounded-full border border-amber-500/30 animate-ping"
                        style={{ animationDuration: "2.5s" }}
                    />
                )}
            </div>

            {/* Basket Panel */}
            {isOpen && (
                <div
                    ref={panelRef}
                    className="fixed z-[60] w-96 max-h-[70vh] bg-zinc-900 rounded-xl shadow-2xl border border-zinc-700 overflow-hidden flex flex-col"
                    style={{
                        left: `${Math.min(position.x - 160, window.innerWidth - 400)}px`,
                        top: `${Math.max(20, position.y - 400)}px`,
                    }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
                        <h3 className="font-medium text-sm text-zinc-300">Корзина ({count})</h3>
                        <div className="flex items-center gap-1">
                            {count > 0 && (
                                <button
                                    onClick={() => { clearAll(); toast.success("Корзина очищена") }}
                                    className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 transition-colors"
                                    title="Очистить всё"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            )}
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 transition-colors"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    </div>

                    {/* Headlines */}
                    <div className="flex-1 overflow-y-auto divide-y divide-zinc-800">
                        {count === 0 ? (
                            <div className="p-6 text-center text-zinc-500 text-sm">
                                Нажмите на точку рядом с заголовком
                            </div>
                        ) : (
                            headlines.map((headline, idx) => (
                                <div key={idx} className="group flex items-start gap-2 px-4 py-2.5 hover:bg-zinc-800/50 transition-colors">
                                    <span className="text-xs text-zinc-600 font-mono mt-0.5 shrink-0">{idx + 1}.</span>
                                    <p className="flex-1 text-sm text-zinc-300 leading-snug">{headline}</p>
                                    <button
                                        onClick={() => removeHeadline(idx)}
                                        className="opacity-0 group-hover:opacity-100 p-1 rounded text-zinc-600 hover:text-rose-400 transition-all shrink-0"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer — orange button */}
                    {count > 0 && (
                        <div className="px-4 py-3 border-t border-zinc-800">
                            <button
                                onClick={handleMakeDescriptions}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-zinc-800 text-amber-500 font-medium text-sm hover:bg-zinc-700 hover:shadow-[0_0_12px_rgba(245,158,11,0.2)] transition-all border border-zinc-700"
                            >
                                <FileText className="h-4 w-4" />
                                Сделать описания ({count})
                            </button>
                        </div>
                    )}
                </div>
            )}
        </>
    )
}
