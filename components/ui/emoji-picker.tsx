"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

const POPULAR_EMOJIS = [
    "🤖", "💬", "✨", "🚀", "📝", "💡", "🎯", "🔥",
    "⚡", "🎨", "📊", "📈", "🎬", "🎵", "📚", "🔬",
    "💻", "📱", "🌟", "🎉", "👋", "💪", "🧠", "🎓",
]

interface EmojiPickerProps {
    value?: string
    onSelect: (emoji: string) => void
}

export function EmojiPicker({ value, onSelect }: EmojiPickerProps) {
    const [open, setOpen] = useState(false)

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className="h-16 w-16 text-3xl p-0"
                    type="button"
                >
                    {value || "😀"}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2">
                <div className="grid grid-cols-8 gap-1">
                    {POPULAR_EMOJIS.map((emoji) => (
                        <button
                            key={emoji}
                            type="button"
                            onClick={() => {
                                onSelect(emoji)
                                setOpen(false)
                            }}
                            className="h-10 w-10 text-2xl hover:bg-muted rounded-md transition-colors"
                        >
                            {emoji}
                        </button>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    )
}
