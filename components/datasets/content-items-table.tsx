/**
 * Content Items Table
 */

"use client"

import { useState, useTransition } from "react"
import Image from "next/image"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Icons } from "@/components/shared/icons"
import { deleteContentItem } from "@/actions/datasets"
import { EditContentDialog } from "@/components/datasets/edit-content-dialog"
import { toast } from "sonner"
import {
    Dialog,
    DialogContent,
    DialogTrigger,
} from "@/components/ui/dialog"

interface ContentItem {
    id: string
    instagramId: string
    originalUrl: string
    sourceUrl: string | null
    coverUrl: string | null
    views: number
    likes: number
    headline: string | null
    transcript: string | null
    isProcessed: boolean
    isApproved: boolean
    processingError: string | null
    publishedAt: Date | null
}

interface ContentItemsTableProps {
    items: ContentItem[]
}

export function ContentItemsTable({ items }: ContentItemsTableProps) {
    const [isPending, startTransition] = useTransition()
    const [expandedId, setExpandedId] = useState<string | null>(null)

    const handleDelete = (itemId: string) => {
        if (!confirm("Удалить этот пост?")) return

        startTransition(async () => {
            try {
                await deleteContentItem(itemId)
                toast.success("Пост удален")
            } catch (error) {
                toast.error("Ошибка удаления")
            }
        })
    }

    const toggleExpand = (id: string) => {
        setExpandedId(expandedId === id ? null : id)
    }

    // Extract username from sourceUrl
    const getSourceName = (url: string | null) => {
        if (!url) return "—"
        const match = url.match(/instagram\.com\/([^/]+)/)
        return match ? `@${match[1]}` : "—"
    }

    if (items.length === 0) {
        return (
            <div className="text-center py-12 border rounded-lg bg-muted/50">
                <Icons.fileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Нет контента</h3>
                <p className="text-muted-foreground">
                    Запустите парсинг источников чтобы собрать контент
                </p>
            </div>
        )
    }

    return (
        <div className="border rounded-lg overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[80px]">Обложка</TableHead>
                        <TableHead className="w-[120px]">Источник</TableHead>
                        <TableHead className="w-[100px]">Дата</TableHead>
                        <TableHead>Заголовок</TableHead>
                        <TableHead className="w-[100px] text-right">Действия</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {items.map((item) => (
                        <TableRow key={item.id} className="group">
                            {/* Cover Image - Clickable to enlarge */}
                            <TableCell>
                                {item.coverUrl ? (
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <div className="relative h-20 w-14 overflow-hidden rounded-md border bg-muted cursor-pointer hover:opacity-80 transition-opacity">
                                                <Image
                                                    src={`https://images.weserv.nl/?url=${encodeURIComponent(item.coverUrl)}`}
                                                    alt="Cover"
                                                    fill
                                                    className="object-cover"
                                                />
                                            </div>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-md p-0 overflow-hidden">
                                            <div className="relative aspect-[9/16] w-full">
                                                <Image
                                                    src={`https://images.weserv.nl/?url=${encodeURIComponent(item.coverUrl)}`}
                                                    alt="Cover enlarged"
                                                    fill
                                                    className="object-contain"
                                                />
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                ) : (
                                    <div className="h-20 w-14 bg-muted rounded-md flex items-center justify-center">
                                        <Icons.media className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                )}
                            </TableCell>

                            {/* Source */}
                            <TableCell>
                                <div className="text-sm">
                                    <p className="font-medium text-primary">
                                        {getSourceName(item.sourceUrl)}
                                    </p>
                                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                                        <span className="flex items-center gap-0.5">
                                            <Icons.eye className="h-3 w-3" />
                                            {item.views > 0 ? item.views.toLocaleString() : "—"}
                                        </span>
                                        <span className="flex items-center gap-0.5">
                                            <Icons.heart className="h-3 w-3" />
                                            {item.likes.toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </TableCell>

                            {/* Published Date */}
                            <TableCell>
                                <div className="text-sm text-muted-foreground">
                                    {item.publishedAt ? (
                                        <span>
                                            {new Date(item.publishedAt).toLocaleDateString('ru-RU', {
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric'
                                            })}
                                        </span>
                                    ) : (
                                        <span className="italic">—</span>
                                    )}
                                </div>
                            </TableCell>

                            {/* Headline - Expandable */}
                            <TableCell>
                                <div className="space-y-2">
                                    {item.headline ? (
                                        <div
                                            className="cursor-pointer"
                                            onClick={() => toggleExpand(item.id)}
                                        >
                                            <p className={`font-medium text-sm leading-snug ${expandedId === item.id ? "" : "line-clamp-2"
                                                }`}>
                                                {item.headline}
                                            </p>
                                            {/* Show expand button only if headline is long enough OR has transcript */}
                                            {(item.headline.length > 80 || item.transcript) && (
                                                <span className="text-xs text-muted-foreground mt-1 inline-block">
                                                    {expandedId === item.id ? "▲ Свернуть" : "▼ Развернуть"}
                                                </span>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground italic">
                                            Заголовок не найден
                                        </p>
                                    )}

                                    {item.processingError && (
                                        <Badge variant="destructive" className="text-[10px]">
                                            Ошибка AI
                                        </Badge>
                                    )}

                                    {/* Transcript section - only when expanded */}
                                    {expandedId === item.id && (
                                        <div className="text-xs text-muted-foreground mt-2 p-2 bg-muted/50 rounded">
                                            <p className="font-medium mb-1">Транскрипт:</p>
                                            {item.transcript ? (
                                                <p className="whitespace-pre-wrap">{item.transcript}</p>
                                            ) : (
                                                <p className="italic">Нет аудио</p>
                                            )}
                                        </div>
                                    )}

                                    <a
                                        href={item.originalUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-primary hover:underline flex items-center gap-1"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        Открыть в Instagram <Icons.externalLink className="h-3 w-3" />
                                    </a>
                                </div>
                            </TableCell>

                            {/* Actions */}
                            <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                    <EditContentDialog item={item} />
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => handleDelete(item.id)}
                                    >
                                        <Icons.trash className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}
