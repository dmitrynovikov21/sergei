"use client"

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"

interface AgentDatasetSelectorProps {
    selectedDatasetId: string | null
    onValueChange: (value: string) => void
    datasets: { id: string; name: string }[]
    disabled?: boolean
}

export function AgentDatasetSelector({
    selectedDatasetId,
    onValueChange,
    datasets,
    disabled
}: AgentDatasetSelectorProps) {
    return (
        <div className="space-y-2">


            <Label className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Датасет (контекст)</Label>
            <Select
                value={selectedDatasetId || "none"}
                onValueChange={onValueChange}
                disabled={disabled}
            >
                <SelectTrigger className="w-full h-9 text-sm">
                    <SelectValue placeholder="Без контекста" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="none">Без контекста</SelectItem>
                    {datasets.map(ds => (
                        <SelectItem key={ds.id} value={ds.id}>{ds.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    )
}
