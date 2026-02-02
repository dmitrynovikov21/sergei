/**
 * Content Items Table - with Excel-like filtering
 */

"use client"

import { useState, useTransition, useMemo } from "react"
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

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
    description?: string | null
    isProcessed: boolean
    isApproved: boolean
    processingError: string | null
    publishedAt: Date | null
    viralityScore: number | null
}

interface ContentItemsTableProps {
    items: ContentItem[]
}

type SortField = 'date' | 'views' | 'likes' | 'virality'
type SortDirection = 'asc' | 'desc'

export function ContentItemsTable({ items }: ContentItemsTableProps) {
    const [isPending, startTransition] = useTransition()
    const [expandedId, setExpandedId] = useState<string | null>(null)

    // Filter & Sort state
    const [sortField, setSortField] = useState<SortField>('date')
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
    const [sourceFilter, setSourceFilter] = useState<string | null>(null)
    const [viralityFilter, setViralityFilter] = useState<'all' | 'viral' | 'trending' | 'normal'>('all')

    // Get unique sources
    const sources = useMemo(() => {
        const set = new Set<string>()
        items.forEach(item => {
            const name = getSourceName(item.sourceUrl)
            if (name !== "—") set.add(name)
        })
        return Array.from(set).sort()
    }, [items])

    // Filtered & Sorted items
    const filteredItems = useMemo(() => {
        let result = [...items]

        // Source filter
        if (sourceFilter) {
            result = result.filter(item => getSourceName(item.sourceUrl) === sourceFilter)
        }

        // Virality filter
        if (viralityFilter !== 'all') {
            result = result.filter(item => {
                const score = item.viralityScore ?? 0
                if (viralityFilter === 'viral') return score >= 1.5
                if (viralityFilter === 'trending') return score >= 1 && score < 1.5
                if (viralityFilter === 'normal') return score < 1
                return true
            })
        }

        // Sort
        result.sort((a, b) => {
            let aVal: number, bVal: number
            switch (sortField) {
                case 'date':
                    aVal = new Date(a.publishedAt || 0).getTime()
                    bVal = new Date(b.publishedAt || 0).getTime()
                    break
                case 'views':
                    aVal = a.views
                    bVal = b.views
                    break
                case 'likes':
                    aVal = a.likes
                    bVal = b.likes
                    break
                case 'virality':
                    aVal = a.viralityScore ?? 0
                    bVal = b.viralityScore ?? 0
                    break
                default:
                    aVal = 0
                    bVal = 0
            }
            return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
        })

        return result
    }, [items, sortField, sortDirection, sourceFilter, viralityFilter])

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

    const toggleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
        } else {
            setSortField(field)
            setSortDirection('desc')
        }
    }

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortField !== field) return <Icons.chevronsUpDown className="h-3 w-3 ml-1 opacity-50" />
        return sortDirection === 'asc'
            ? <Icons.chevronUp className="h-3 w-3 ml-1" />
            : <Icons.chevronDown className="h-3 w-3 ml-1" />
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
        <TooltipProvider>
            <div className="space-y-3">
                {/* Filters Bar */}
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-muted-foreground">Фильтры:</span>

                    {/* Source Filter */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8">
                                <Icons.user className="h-3 w-3 mr-1" />
                                {sourceFilter || "Все источники"}
                                <Icons.chevronDown className="h-3 w-3 ml-1" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => setSourceFilter(null)}>
                                Все источники
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {sources.map(source => (
                                <DropdownMenuItem key={source} onClick={() => setSourceFilter(source)}>
                                    {source}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Virality Filter */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8">
                                🔥 {viralityFilter === 'all' ? 'Вся виральность' :
                                    viralityFilter === 'viral' ? 'Вирусные 🔥' :
                                        viralityFilter === 'trending' ? 'Растущие 📈' : 'Обычные'}
                                <Icons.chevronDown className="h-3 w-3 ml-1" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => setViralityFilter('all')}>
                                Вся виральность
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setViralityFilter('viral')}>
                                🔥 Вирусные (≥1.5x)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setViralityFilter('trending')}>
                                📈 Растущие (1-1.5x)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setViralityFilter('normal')}>
                                Обычные (&lt;1x)
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Results count */}
                    <span className="text-sm text-muted-foreground ml-auto">
                        {filteredItems.length} из {items.length}
                    </span>
                </div>

                {/* Table */}
                <div className="border rounded-lg overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/30">
                                <TableHead className="w-[40px] px-2 text-center">#</TableHead>
                                <TableHead className="w-[50px] px-2"></TableHead>
                                <TableHead className="w-[90px] px-2">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <span className="text-xs cursor-pointer hover:text-primary flex items-center">
                                                Источник <Icons.filter className="h-2.5 w-2.5 ml-0.5 opacity-50" />
                                            </span>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <DropdownMenuItem onClick={() => setSourceFilter(null)}>
                                                Все
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            {sources.map(source => (
                                                <DropdownMenuItem key={source} onClick={() => setSourceFilter(source)}>
                                                    {source}
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableHead>
                                <TableHead className="w-[70px] px-2 cursor-pointer hover:text-primary" onClick={() => toggleSort('date')}>
                                    <span className="text-xs flex items-center">Дата<SortIcon field="date" /></span>
                                </TableHead>
                                <TableHead className="w-[60px] px-2 cursor-pointer hover:text-primary text-center" onClick={() => toggleSort('views')}>
                                    <span className="text-xs flex items-center justify-center">👁️<SortIcon field="views" /></span>
                                </TableHead>
                                <TableHead className="w-[50px] px-2 cursor-pointer hover:text-primary text-center" onClick={() => toggleSort('likes')}>
                                    <span className="text-xs flex items-center justify-center">❤️<SortIcon field="likes" /></span>
                                </TableHead>
                                <TableHead className="w-[55px] px-2 cursor-pointer hover:text-primary text-center" onClick={() => toggleSort('virality')}>
                                    <span className="text-xs flex items-center justify-center">🔥<SortIcon field="virality" /></span>
                                </TableHead>
                                <TableHead className="px-2"><span className="text-xs">Заголовок</span></TableHead>
                                <TableHead className="w-[60px] px-2 text-right"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredItems.map((item) => (
                                <TableRow key={item.id} className="group hover:bg-muted/20">
                                    {/* Index */}
                                    <TableCell className="p-2 text-center text-xs text-muted-foreground">
                                        {filteredItems.indexOf(item) + 1}
                                    </TableCell>

                                    {/* Cover Image */}
                                    <TableCell className="p-2">
                                        {item.coverUrl ? (
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <div className="relative h-14 w-10 overflow-hidden rounded border bg-muted cursor-pointer hover:opacity-80 transition-opacity">
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
                                            <div className="h-14 w-10 bg-muted rounded flex items-center justify-center">
                                                <Icons.media className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                        )}
                                    </TableCell>

                                    {/* Source */}
                                    <TableCell className="p-2">
                                        <span className="text-xs font-medium text-primary">
                                            {getSourceName(item.sourceUrl)}
                                        </span>
                                    </TableCell>

                                    {/* Date */}
                                    <TableCell className="p-2">
                                        <span className="text-xs text-muted-foreground">
                                            {item.publishedAt ? (
                                                new Date(item.publishedAt).toLocaleDateString('ru-RU', {
                                                    day: 'numeric',
                                                    month: 'short'
                                                })
                                            ) : "—"}
                                        </span>
                                    </TableCell>

                                    {/* Views */}
                                    <TableCell className="p-2">
                                        <span className="text-xs font-medium tabular-nums">
                                            {item.views > 0 ? formatNumber(item.views) : "—"}
                                        </span>
                                    </TableCell>

                                    {/* Likes */}
                                    <TableCell className="p-2">
                                        <span className="text-xs font-medium tabular-nums">
                                            {formatNumber(item.likes)}
                                        </span>
                                    </TableCell>

                                    {/* Virality */}
                                    <TableCell className="p-2">
                                        {item.viralityScore != null ? (
                                            <Badge
                                                variant={item.viralityScore >= 1.5 ? "destructive" : item.viralityScore >= 1 ? "default" : "secondary"}
                                                className="text-xs px-1.5 py-0"
                                            >
                                                {item.viralityScore >= 1.5 ? '🔥' : item.viralityScore >= 1 ? '📈' : ''}
                                                {item.viralityScore.toFixed(1)}x
                                            </Badge>
                                        ) : (
                                            <span className="text-xs text-muted-foreground">—</span>
                                        )}
                                    </TableCell>

                                    {/* Headline + Description */}
                                    <TableCell className="p-2">
                                        <div className="space-y-1">
                                            {item.headline ? (
                                                <p className="text-xs font-medium leading-tight line-clamp-2">
                                                    {item.headline}
                                                </p>
                                            ) : (
                                                <p className="text-xs text-muted-foreground italic">
                                                    Без заголовка
                                                </p>
                                            )}
                                            {/* Description preview */}
                                            {(item as any).description && (
                                                <p className="text-[10px] text-muted-foreground line-clamp-1">
                                                    {(item as any).description}
                                                </p>
                                            )}
                                        </div>
                                    </TableCell>

                                    {/* Actions */}
                                    <TableCell className="p-1 text-right">
                                        <div className="flex justify-end items-center gap-0">
                                            {/* Instagram Link - single small icon */}
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <a
                                                        href={item.originalUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-1 rounded hover:bg-muted transition-colors"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <Icons.instagram className="h-3 w-3 text-pink-500" />
                                                    </a>
                                                </TooltipTrigger>
                                                <TooltipContent side="left">Открыть в Instagram</TooltipContent>
                                            </Tooltip>

                                            {/* Edit Button */}
                                            <EditContentDialog item={item} />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </TooltipProvider>
    )
}

// Helper function to extract username
function getSourceName(url: string | null): string {
    if (!url) return "—"
    const match = url.match(/instagram\.com\/([^/]+)/)
    return match ? `@${match[1]}` : "—"
}

// Format large numbers (1234 -> 1.2K)
function formatNumber(num: number): string {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
}
