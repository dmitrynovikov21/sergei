/**
 * Datasets List Component
 */

"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Icons } from "@/components/shared/icons"
import { deleteDataset } from "@/actions/datasets"
import { toast } from "sonner"

interface Dataset {
    id: string
    name: string
    description: string | null
    createdAt: Date
    _count: {
        sources: number
        items: number
    }
}

interface DatasetsListProps {
    datasets: Dataset[]
}

export function DatasetsList({ datasets }: DatasetsListProps) {
    const [isPending, startTransition] = useTransition()
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const router = useRouter()

    const handleDelete = (e: React.MouseEvent, datasetId: string, name: string) => {
        e.preventDefault() // Prevent navigation
        e.stopPropagation()

        if (!confirm(`Удалить датасет "${name}"? Все источники и контент будут удалены.`)) return

        setDeletingId(datasetId)
        startTransition(async () => {
            try {
                await deleteDataset(datasetId)
                toast.success("Датасет удален")
                router.refresh()
            } catch (error) {
                toast.error("Ошибка удаления")
            } finally {
                setDeletingId(null)
            }
        })
    }

    if (datasets.length === 0) {
        return (
            <div className="text-center py-12 border rounded-lg bg-muted/50">
                <Icons.database className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Нет датасетов</h3>
                <p className="text-muted-foreground">
                    Создайте первый датасет для сбора контента
                </p>
            </div>
        )
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {datasets.map((dataset) => (
                <Link key={dataset.id} href={`/dashboard/datasets/${dataset.id}`}>
                    <Card className="hover:border-primary/50 transition-colors cursor-pointer h-[140px] flex flex-col group relative">
                        {/* Delete button */}
                        <Button
                            size="icon"
                            variant="ghost"
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                            onClick={(e) => handleDelete(e, dataset.id, dataset.name)}
                            disabled={isPending || deletingId === dataset.id}
                        >
                            {deletingId === dataset.id ? (
                                <Icons.spinner className="h-4 w-4 animate-spin" />
                            ) : (
                                <Icons.trash className="h-4 w-4 text-destructive" />
                            )}
                        </Button>

                        <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-2 text-base pr-8">
                                <Icons.database className="h-4 w-4 shrink-0" />
                                <span className="truncate">{dataset.name}</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col justify-end">
                            <div className="flex gap-4 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                    <Icons.link className="h-4 w-4" />
                                    {dataset._count.sources} источников
                                </span>
                                <span className="flex items-center gap-1">
                                    <Icons.fileText className="h-4 w-4" />
                                    {dataset._count.items} постов
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                </Link>
            ))}
        </div>
    )
}
