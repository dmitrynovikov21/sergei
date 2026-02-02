"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Icons } from "@/components/shared/icons"
import { toast } from "sonner"

interface Dataset {
    id: string
    name: string
}

interface ContextSelectorProps {
    datasets: Dataset[]
}

const STORAGE_KEY = "global_dataset_context"

export function ContextSelector({ datasets }: ContextSelectorProps) {
    const [selectedId, setSelectedId] = useState<string>("none")
    const [mounted, setMounted] = useState(false)
    const router = useRouter()

    // Load from localStorage on mount
    useEffect(() => {
        setMounted(true)
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored && datasets.some(d => d.id === stored)) {
            setSelectedId(stored)
        }
    }, [datasets])

    const handleValueChange = (value: string) => {
        setSelectedId(value)

        // Save to localStorage
        if (value === "none") {
            localStorage.removeItem(STORAGE_KEY)
            toast.success("Контекст сброшен")
        } else {
            localStorage.setItem(STORAGE_KEY, value)
            const name = datasets.find(d => d.id === value)?.name
            toast.success(`Контекст выбран: ${name}`)
        }

        router.refresh()
    }

    // Avoid hydration mismatch
    if (!mounted) {
        return (
            <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-muted-foreground">Контекст:</span>
                <div className="w-[200px] h-9 bg-zinc-100 dark:bg-zinc-800 rounded-md animate-pulse" />
            </div>
        )
    }

    return (
        <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">Контекст:</span>
            <Select
                value={selectedId}
                onValueChange={handleValueChange}
            >
                <SelectTrigger className="w-[200px] h-9 text-sm">
                    <div className="flex items-center gap-2 truncate">
                        <Icons.database className="h-4 w-4 flex-shrink-0 text-zinc-500" />
                        <SelectValue placeholder="Выберите датасет" />
                    </div>
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="none">
                        <span className="text-muted-foreground">Без контекста</span>
                    </SelectItem>
                    {datasets.map((dataset) => (
                        <SelectItem key={dataset.id} value={dataset.id}>
                            {dataset.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    )
}
