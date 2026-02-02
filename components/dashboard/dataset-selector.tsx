/**
 * Dataset Selector Component
 * 
 * Allows selecting a dataset to inject RAG context into the chat
 */

"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Icons } from "@/components/shared/icons"
import { updateChatDataset } from "@/actions/datasets"
import { toast } from "sonner"

interface Dataset {
    id: string
    name: string
}

interface DatasetSelectorProps {
    chatId: string
    currentDatasetId: string | null
    datasets: Dataset[]
}

export function DatasetSelector({ chatId, currentDatasetId, datasets }: DatasetSelectorProps) {
    const [isPending, startTransition] = useTransition()
    const router = useRouter()

    const handleValueChange = (value: string) => {
        const datasetId = value === "none" ? null : value

        startTransition(async () => {
            try {
                await updateChatDataset(chatId, datasetId)
                toast.success(datasetId ? "Контекст подключен" : "Контекст отключен")
                router.refresh()
            } catch (error) {
                toast.error("Ошибка обновления контекста")
            }
        })
    }

    return (
        <Select
            disabled={isPending}
            onValueChange={handleValueChange}
            defaultValue={currentDatasetId || "none"}
        >
            <SelectTrigger className="w-[180px] h-8 text-xs">
                <div className="flex items-center gap-2 truncate">
                    {isPending ? (
                        <Icons.spinner className="h-3 w-3 animate-spin flex-shrink-0" />
                    ) : (
                        <Icons.database className="h-3 w-3 flex-shrink-0" />
                    )}
                    <SelectValue placeholder="Без котекста" />
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
    )
}
