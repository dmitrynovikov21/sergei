"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Icons } from "@/components/shared/icons"
import { cn } from "@/lib/utils"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import type { Attachment } from "./types"

export type { Attachment }

interface ChatInputProps {
    input: string
    setInput: (value: string) => void
    onSubmit: (e: React.FormEvent) => void
    isPending: boolean
    centered?: boolean
    onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void
    onFileDrop: (files: FileList) => void
    onFilePaste?: (files: File[]) => void
    attachments: Attachment[]
    removeAttachment: (index: number) => void
    onStop?: () => void
    // Dataset selector
    datasets?: { id: string, name: string }[]
    selectedDatasetId?: string | null
    onDatasetChange?: (id: string | null) => void
}

export function ChatInput({
    input,
    setInput,
    onSubmit,
    isPending,
    centered = false,
    onFileSelect,
    onFileDrop,
    onFilePaste,
    attachments,
    removeAttachment,
    onStop,
    // Dataset selector
    datasets = [],
    selectedDatasetId,
    onDatasetChange
}: ChatInputProps) {
    const imageInputRef = useRef<HTMLInputElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const formRef = useRef<HTMLFormElement>(null)
    const [isDragging, setIsDragging] = useState(false)

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(true)
    }

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault()
        // Only set isDragging to false if we're leaving the form entirely
        if (formRef.current && !formRef.current.contains(e.relatedTarget as Node)) {
            setIsDragging(false)
        }
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(false)
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            onFileDrop(e.dataTransfer.files)
        }
    }

    const handlePaste = (e: React.ClipboardEvent) => {
        const items = e.clipboardData?.items
        if (!items) return

        const imageFiles: File[] = []
        for (let i = 0; i < items.length; i++) {
            const item = items[i]
            if (item.type.startsWith('image/')) {
                const file = item.getAsFile()
                if (file) imageFiles.push(file)
            }
        }

        if (imageFiles.length > 0) {
            e.preventDefault() // Prevent pasting image as text
            if (onFilePaste) {
                onFilePaste(imageFiles)
            } else {
                // Fallback: create a FileList-like via DataTransfer
                const dt = new DataTransfer()
                imageFiles.forEach(f => dt.items.add(f))
                onFileDrop(dt.files)
            }
        }
    }

    return (
        <form
            ref={formRef}
            onSubmit={onSubmit}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
                "relative flex flex-col rounded-2xl border border-border px-4 py-3 transition-all bg-muted",
                centered ? "w-full" : "",
                isDragging && "ring-2 ring-accent border-accent bg-accent/5"
            )}
        >
            {/* Drag indicator */}
            {isDragging && (
                <div className="absolute inset-0 flex items-center justify-center bg-accent/10 rounded-xl z-10 pointer-events-none">
                    <p className="text-accent font-medium">Отпустите для загрузки</p>
                </div>
            )}

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

            {/* Row 1: Textarea */}
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
                onPaste={handlePaste}
                placeholder="Напишите ваш запрос..."
                className="w-full h-auto min-h-[20px] max-h-[120px] resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 p-0 text-[15px] text-foreground placeholder:text-muted-foreground/60"
                rows={2}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
            />

            {/* Row 2: Buttons */}
            <div className="flex items-center justify-between mt-2 -ml-1">
                {/* Left: + and clock */}
                <div className="flex items-center gap-1">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 rounded-md text-muted-foreground/70 hover:text-foreground hover:bg-transparent transition-colors"
                            >
                                <Icons.add className="h-4 w-4" strokeWidth={1.5} />
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

                {/* Right: Dataset selector and send */}
                <div className="flex items-center gap-1.5">
                    {datasets.length > 0 && (
                        <Popover>
                            <PopoverTrigger asChild>
                                <button
                                    type="button"
                                    className="flex items-center gap-1 px-2 py-0.5 text-xs text-muted-foreground/70 hover:text-foreground transition-colors rounded-md hover:bg-muted/50"
                                >
                                    <span>{datasets.find(d => d.id === selectedDatasetId)?.name || "Без контекста"}</span>
                                    <Icons.chevronDown className="h-3 w-3" />
                                </button>
                            </PopoverTrigger>
                            <PopoverContent side="top" align="end" className="w-64 p-1 max-h-64 overflow-y-auto scrollbar-none">
                                <button
                                    type="button"
                                    onClick={() => onDatasetChange?.(null)}
                                    className={cn(
                                        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors",
                                        !selectedDatasetId ? "text-foreground" : "text-muted-foreground"
                                    )}
                                >
                                    <span className={cn("w-2 h-2 rounded-full", !selectedDatasetId ? "bg-accent" : "bg-transparent")}></span>
                                    <span>Без контекста</span>
                                </button>
                                {datasets.map(ds => (
                                    <button
                                        key={ds.id}
                                        type="button"
                                        onClick={() => onDatasetChange?.(ds.id)}
                                        className={cn(
                                            "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors",
                                            selectedDatasetId === ds.id ? "text-foreground" : "text-muted-foreground"
                                        )}
                                    >
                                        <span className={cn("w-2 h-2 rounded-full", selectedDatasetId === ds.id ? "bg-accent" : "bg-transparent")}></span>
                                        <span className="truncate">{ds.name}</span>
                                    </button>
                                ))}
                            </PopoverContent>
                        </Popover>
                    )}

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
                            "h-7 w-7 rounded-md shrink-0 transition-all",
                            isPending
                                ? "bg-transparent border border-foreground/50 text-foreground hover:border-foreground"
                                : "bg-[#D97757] text-white hover:bg-[#c56a4c] disabled:opacity-30 disabled:bg-muted disabled:text-muted-foreground"
                        )}
                        disabled={!isPending && (!input.trim() && attachments.length === 0)}
                    >
                        {isPending ? (
                            <div className="h-2 w-2 bg-current rounded-sm" />
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
