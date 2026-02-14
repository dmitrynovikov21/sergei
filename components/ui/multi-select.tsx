/**
 * Multi-Select Dropdown Component
 * 
 * Reusable dropdown for selecting multiple options with "All/Clear" actions
 */

"use client"

import { useState } from "react"
import { Check, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface MultiSelectProps {
    options: string[]
    selected: Set<string>
    onChange: (selected: Set<string>) => void
    placeholder: string
    allLabel?: string
    className?: string
}

export function MultiSelect({
    options,
    selected,
    onChange,
    placeholder,
    allLabel = "Все",
    className
}: MultiSelectProps) {
    const [open, setOpen] = useState(false)

    const toggleOption = (option: string) => {
        const newSelected = new Set(selected)
        if (newSelected.has(option)) {
            newSelected.delete(option)
        } else {
            newSelected.add(option)
        }
        onChange(newSelected)
    }

    const selectAll = () => onChange(new Set(options))
    const clearAll = () => onChange(new Set())

    const displayText = selected.size === 0
        ? placeholder
        : selected.size === options.length
            ? allLabel
            : `${selected.size} выбрано`

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className={cn("w-44 justify-between bg-muted border-border/50 font-normal", className)}
                >
                    {displayText}
                    <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2" align="start">
                <div className="flex gap-2 mb-2">
                    <Button size="sm" variant="ghost" className="text-xs h-7 flex-1" onClick={selectAll}>
                        Все
                    </Button>
                    <Button size="sm" variant="ghost" className="text-xs h-7 flex-1" onClick={clearAll}>
                        Сброс
                    </Button>
                </div>
                <div className="max-h-96 overflow-y-auto space-y-1">
                    {options.map(option => (
                        <div
                            key={option}
                            className={cn(
                                "flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-muted/50 text-sm",
                                selected.has(option) && "bg-muted/30"
                            )}
                            onClick={() => toggleOption(option)}
                        >
                            <div className={cn(
                                "w-4 h-4 rounded border flex items-center justify-center",
                                selected.has(option) ? "bg-primary border-primary" : "border-border"
                            )}>
                                {selected.has(option) && <Check className="h-3 w-3 text-primary-foreground" />}
                            </div>
                            {option}
                        </div>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    )
}
