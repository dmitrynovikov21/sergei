"use strict";
"use client"

import { useState } from "react"
import { EmojiPicker } from "@/components/ui/emoji-picker"
import { updateAgentIcon } from "@/actions/agents"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface AgentHeaderIconProps {
    agentId: string
    currentIcon: string
    agentName: string
}

export function AgentHeaderIcon({ agentId, currentIcon, agentName }: AgentHeaderIconProps) {
    const [open, setOpen] = useState(false)

    const handleSelect = async (emoji: string) => {
        try {
            await updateAgentIcon(agentId, emoji)
            setOpen(false)
        } catch (error) {
            console.error("Failed to update icon:", error)
        }
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" className="h-auto w-auto p-0 hover:bg-transparent">
                    <span className="text-xl leading-none cursor-pointer hover:scale-110 transition-transform select-none">
                        {currentIcon}
                    </span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 border-none bg-transparent shadow-none" align="start">
                <EmojiPicker
                    value={currentIcon}
                    onSelect={handleSelect}
                />
            </PopoverContent>
        </Popover>
    )
}
