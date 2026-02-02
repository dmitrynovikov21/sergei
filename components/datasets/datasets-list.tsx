/**
 * Datasets List Component - Table View
 */

"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Icons } from "@/components/shared/icons"
import { deleteDataset } from "@/actions/datasets"
import { toast } from "sonner"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

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

    const [alertOpen, setAlertOpen] = useState(false)
    const [datasetToDelete, setDatasetToDelete] = useState<{ id: string, name: string } | null>(null)

    const handleDeleteClick = (e: React.MouseEvent, dataset: { id: string, name: string }) => {
        e.preventDefault()
        e.stopPropagation()
        setDatasetToDelete(dataset)
        setAlertOpen(true)
    }

    const handleConfirmDelete = (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()

        if (!datasetToDelete) return

        setDeletingId(datasetToDelete.id)
        startTransition(async () => {
            try {
                await deleteDataset(datasetToDelete.id)
                toast.success("Датасет удален")
                router.refresh()
            } catch (error) {
                toast.error("Ошибка удаления")
            } finally {
                setDeletingId(null)
                setAlertOpen(false)
                setDatasetToDelete(null)
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
        <>
            <div className="rounded-lg border border-border/50 overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                            <TableHead className="font-semibold">Название</TableHead>
                            <TableHead className="font-semibold w-[120px]">Источников</TableHead>
                            <TableHead className="font-semibold w-[120px]">Постов</TableHead>
                            <TableHead className="font-semibold w-[150px]">Создан</TableHead>
                            <TableHead className="w-[80px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {datasets.map((dataset) => (
                            <TableRow
                                key={dataset.id}
                                className="cursor-pointer hover:bg-muted/30 transition-colors"
                                onClick={() => router.push(`/dashboard/datasets/${dataset.id}`)}
                            >
                                <TableCell className="font-medium">
                                    <div className="flex items-center gap-2">
                                        <Icons.database className="h-4 w-4 text-muted-foreground shrink-0" />
                                        <span className="truncate max-w-[300px]">{dataset.name}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                    {dataset._count.sources}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                    {dataset._count.items}
                                </TableCell>
                                <TableCell className="text-muted-foreground text-sm">
                                    {new Date(dataset.createdAt).toLocaleDateString('ru-RU', {
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric'
                                    })}
                                </TableCell>
                                <TableCell>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-8 w-8 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                                        onClick={(e) => handleDeleteClick(e, { id: dataset.id, name: dataset.name })}
                                        disabled={isPending || deletingId === dataset.id}
                                    >
                                        {deletingId === dataset.id ? (
                                            <Icons.spinner className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Icons.trash className="h-4 w-4" />
                                        )}
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
                <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Удалить датасет?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Датасет "{datasetToDelete?.name}" и все связанные с ним источники и контент будут безвозвратно удалены.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={(e) => { e.stopPropagation(); setAlertOpen(false) }}>
                            Отмена
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmDelete}
                            className="bg-red-500 hover:bg-red-600 focus:ring-red-500"
                            disabled={isPending}
                        >
                            {isPending ? "Удаление..." : "Удалить"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
