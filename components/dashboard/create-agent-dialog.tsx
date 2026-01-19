"use client"

import React, { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { createAgent } from "@/actions/agents"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-amber-500" />
                        Создать нового агента
                    </DialogTitle>
                    <DialogDescription>
                        Введите название, остальное можно настроить потом в настройках
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 py-4">
                    {/* Emoji Selection */}
                    <div className="flex items-center gap-4">
                        <div
                            className="h-16 w-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-4xl cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                            onClick={handleRandomEmoji}
                        >
                            {emoji}
                        </div>
                        <div className="flex-1">
                            <Label htmlFor="agent-name" className="text-sm font-medium">
                                Название агента
                            </Label>
                            <Input
                                id="agent-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Мой помощник"
                                className="mt-1"
                            />
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleRandomEmoji}
                            className="h-10 w-10"
                            title="Случайный эмодзи"
                        >
                            <RefreshCw className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => setOpen(false)}
                        disabled={isPending}
                    >
                        Отмена
                    </Button>
                    <Button
                        onClick={handleCreate}
                        disabled={isPending || !name.trim()}
                        className="bg-zinc-900 hover:bg-black text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-black"
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
