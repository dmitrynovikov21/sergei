"use client"

import React, { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { createAgent } from "@/actions/agents"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { Plus, Sparkles, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"

// Random emoji list for agents
const AGENT_EMOJIS = [
    "🤖", "🧠", "💡", "🚀", "✨", "🎯", "📝", "🔥", "💎", "⚡",
    "🎨", "📊", "🔮", "🌟", "💼", "🎭", "🧩", "📈", "🏆", "💪",
    "🎪", "🎲", "🎸", "🎹", "🎤", "📚", "🔍", "💻", "🖊️", "✏️"
]

const getRandomEmoji = () => AGENT_EMOJIS[Math.floor(Math.random() * AGENT_EMOJIS.length)]

interface CreateAgentDialogProps {
    trigger?: React.ReactNode
}

export function CreateAgentDialog({ trigger }: CreateAgentDialogProps) {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [isPending, startTransition] = useTransition()

    const [name, setName] = useState("")
    const [emoji, setEmoji] = useState(getRandomEmoji())

    // Default system prompt - user can customize in settings later
    const DEFAULT_SYSTEM_PROMPT = "Ты полезный AI-ассистент. Отвечай на русском языке."

    const handleRandomEmoji = () => {
        setEmoji(getRandomEmoji())
    }

    const handleCreate = () => {
        if (!name.trim()) {
            toast.error("Введите название агента")
            return
        }

        startTransition(async () => {
            try {
                await createAgent({
                    name: name.trim(),
                    systemPrompt: DEFAULT_SYSTEM_PROMPT,
                    icon: emoji
                })

                toast.success("Агент создан!")
                setOpen(false)

                // Reset form
                setName("")
                setEmoji(getRandomEmoji())

                router.refresh()
            } catch (error) {
                console.error("Failed to create agent:", error)
                toast.error("Ошибка создания агента")
            }
        })
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button
                        variant="outline"
                        className="h-full min-h-[200px] border-dashed border-2 border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all"
                    >
                        <div className="flex flex-col items-center gap-3 text-zinc-400">
                            <Plus className="h-8 w-8" />
                            <span className="text-sm font-medium">Создать агента</span>
                        </div>
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-800">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-foreground">
                        <Sparkles className="h-5 w-5 text-amber-500" />
                        Создать нового агента
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                        Введите название, остальное можно настроить потом в настройках
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    {/* Compact emoji + name row */}
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={handleRandomEmoji}
                            className="h-10 w-10 shrink-0 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-xl transition-colors"
                            title="Нажмите для случайного эмодзи"
                        >
                            {emoji}
                        </button>
                        <div className="flex-1">
                            <Label htmlFor="agent-name" className="sr-only">
                                Название агента
                            </Label>
                            <Input
                                id="agent-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Название агента"
                                className="h-10 bg-zinc-800 border-zinc-700 text-foreground placeholder:text-muted-foreground"
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && name.trim()) {
                                        handleCreate()
                                    }
                                }}
                            />
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleRandomEmoji}
                            className="h-10 w-10 shrink-0 text-muted-foreground hover:text-foreground"
                            title="Случайный эмодзи"
                        >
                            <RefreshCw className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-2">
                    <Button
                        variant="outline"
                        onClick={() => setOpen(false)}
                        disabled={isPending}
                        className="border-zinc-700 text-muted-foreground hover:text-foreground hover:bg-zinc-800"
                    >
                        Отмена
                    </Button>
                    <Button
                        onClick={handleCreate}
                        disabled={isPending || !name.trim()}
                        className="bg-foreground hover:bg-foreground/90 text-background"
                    >
                        {isPending ? (
                            <>Создание...</>
                        ) : (
                            <>
                                <Plus className="h-4 w-4 mr-2" />
                                Создать
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

