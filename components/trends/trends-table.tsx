/**
 * Trends Table Component
 * Displays all content items with filters and sorting
 */

"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import { ExternalLink, ChevronUp, ChevronDown, Image, Copy, Check, X } from "lucide-react"
import { Icons } from "@/components/shared/icons"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface ContentItem {
    id: string
    headline: string | null
    description: string | null
    originalUrl: string
    coverUrl: string | null
    videoUrl?: string | null
    views: number
    likes: number
    comments: number
    viralityScore: number | null
    publishedAt: Date | null
    sourceUsername: string
    datasetName: string
    contentType: 'Reel' | 'Carousel'
    // AI Analysis fields
    aiTopic?: string | null
    aiSubtopic?: string | null
    aiHookType?: string | null
    aiContentFormula?: string | null
    aiTags?: string | null
    aiSuccessReason?: string | null
    aiEmotionalTrigger?: string | null
    aiTargetAudience?: string | null
}

interface TrendsTableProps {
    items: ContentItem[]
}

type SortField = 'views' | 'likes' | 'comments' | 'virality' | 'date'
type SortOrder = 'asc' | 'desc'

// Multi-select dropdown component
function MultiSelect({
    options,
    selected,
    onChange,
    placeholder,
    allLabel = "Все"
}: {
    options: string[]
    selected: Set<string>
    onChange: (selected: Set<string>) => void
    placeholder: string
    allLabel?: string
}) {
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

    const selectAll = () => {
        onChange(new Set(options))
    }

    const clearAll = () => {
        onChange(new Set())
    }

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
                    className="w-44 justify-between bg-muted border-border/50 font-normal"
                >
                    {displayText}
                    <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2" align="start">
                <div className="flex gap-2 mb-2">
                    <Button size="sm" variant="ghost" className="text-xs h-7 flex-1" onClick={selectAll}>
                        Все
                    </Button>
                    <Button size="sm" variant="ghost" className="text-xs h-7 flex-1" onClick={clearAll}>
                        Сброс
                    </Button>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1">
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

export function TrendsTable({ items }: TrendsTableProps) {
    const [search, setSearch] = useState("")
    const [typeFilters, setTypeFilters] = useState<Set<string>>(new Set(['Reel', 'Carousel']))
    const [sourceFilters, setSourceFilters] = useState<Set<string>>(new Set())
    const [sortField, setSortField] = useState<SortField>('virality')
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
    const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null)

    // Range filters
    const [minViews, setMinViews] = useState("")
    const [minLikes, setMinLikes] = useState("")
    const [minVirality, setMinVirality] = useState("")
    const [minComments, setMinComments] = useState("")
    const [dateFrom, setDateFrom] = useState("")
    const [dateTo, setDateTo] = useState("")

    // Resizable headline column
    const [headlineWidth, setHeadlineWidth] = useState(200)
    const isResizing = useRef(false)
    const startX = useRef(0)
    const startWidth = useRef(200)

    // Get unique sources
    const sources = useMemo(() => {
        const uniqueSources = [...new Set(items.map(i => i.sourceUsername))]
        return uniqueSources.filter(s => s !== 'unknown').sort()
    }, [items])

    // Initialize source filters to include all
    useEffect(() => {
        if (sourceFilters.size === 0 && sources.length > 0) {
            setSourceFilters(new Set(sources))
        }
    }, [sources])

    // Handle column click for sorting
    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')
        } else {
            setSortField(field)
            setSortOrder('desc')
        }
    }

    // Copy to clipboard
    const copyText = (text: string, e: React.MouseEvent) => {
        e.stopPropagation()
        navigator.clipboard.writeText(text)
        toast.success("Скопировано")
    }

    // Filter and sort
    const filteredItems = useMemo(() => {
        let result = [...items]

        // Search filter
        if (search) {
            const searchLower = search.toLowerCase()
            result = result.filter(item =>
                item.headline?.toLowerCase().includes(searchLower) ||
                item.description?.toLowerCase().includes(searchLower) ||
                item.sourceUsername.toLowerCase().includes(searchLower)
            )
        }

        // Type filter
        if (typeFilters.size > 0) {
            result = result.filter(item => typeFilters.has(item.contentType))
        }

        // Source filter
        if (sourceFilters.size > 0 && sourceFilters.size < sources.length) {
            result = result.filter(item => sourceFilters.has(item.sourceUsername))
        }

        // Date range filter
        if (dateFrom) {
            const fromDate = new Date(dateFrom)
            result = result.filter(item => item.publishedAt && new Date(item.publishedAt) >= fromDate)
        }
        if (dateTo) {
            const toDate = new Date(dateTo)
            toDate.setHours(23, 59, 59, 999)
            result = result.filter(item => item.publishedAt && new Date(item.publishedAt) <= toDate)
        }

        // Range filters
        const minViewsNum = parseInt(minViews) || 0
        const minLikesNum = parseInt(minLikes) || 0
        const minViralityNum = parseFloat(minVirality) || 0
        const minCommentsNum = parseInt(minComments) || 0

        if (minViewsNum > 0) result = result.filter(item => item.views >= minViewsNum)
        if (minLikesNum > 0) result = result.filter(item => item.likes >= minLikesNum)
        if (minViralityNum > 0) result = result.filter(item => (item.viralityScore || 0) >= minViralityNum)
        if (minCommentsNum > 0) result = result.filter(item => item.comments >= minCommentsNum)

        // Sort
        const multiplier = sortOrder === 'desc' ? -1 : 1
        result.sort((a, b) => {
            let comparison = 0
            switch (sortField) {
                case 'virality':
                    comparison = (a.viralityScore || 0) - (b.viralityScore || 0)
                    break
                case 'views':
                    comparison = a.views - b.views
                    break
                case 'likes':
                    comparison = a.likes - b.likes
                    break
                case 'comments':
                    comparison = a.comments - b.comments
                    break
                case 'date':
                    comparison = (new Date(a.publishedAt || 0)).getTime() - (new Date(b.publishedAt || 0)).getTime()
                    break
            }
            return comparison * multiplier
        })

        return result
    }, [items, search, typeFilters, sourceFilters, sources.length, sortField, sortOrder, minViews, minLikes, minVirality, minComments, dateFrom, dateTo])

    const formatNumber = (num: number) => {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
        return num.toString()
    }

    const formatDate = (date: Date | null) => {
        if (!date) return '—'
        const d = new Date(date)
        const day = d.getDate().toString().padStart(2, '0')
        const month = (d.getMonth() + 1).toString().padStart(2, '0')
        return `${day}.${month}`
    }

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortField !== field) return <ChevronDown className="h-3 w-3 opacity-30" />
        return sortOrder === 'desc'
            ? <ChevronDown className="h-3 w-3" />
            : <ChevronUp className="h-3 w-3" />
    }

    // Resize handlers for headline column
    const handleResizeStart = (e: React.MouseEvent) => {
        e.preventDefault()
        isResizing.current = true
        startX.current = e.clientX
        startWidth.current = headlineWidth
        document.body.style.cursor = 'col-resize'
        document.body.style.userSelect = 'none'
    }

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing.current) return
            const delta = e.clientX - startX.current
            const newWidth = Math.max(100, Math.min(600, startWidth.current + delta))
            setHeadlineWidth(newWidth)
        }

        const handleMouseUp = () => {
            isResizing.current = false
            document.body.style.cursor = ''
            document.body.style.userSelect = ''
        }

        document.addEventListener('mousemove', handleMouseMove)
        document.addEventListener('mouseup', handleMouseUp)
        return () => {
            document.removeEventListener('mousemove', handleMouseMove)
            document.removeEventListener('mouseup', handleMouseUp)
        }
    }, [headlineWidth])


    return (
        <TooltipProvider>
            <div className="space-y-4">
                {/* Filters Row 1 */}
                <div className="flex flex-wrap gap-3 items-center">
                    <Input
                        placeholder="Поиск по заголовку..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-56 bg-muted border-border/50"
                    />

                    {/* Type multi-select */}
                    <MultiSelect
                        options={['Reel', 'Carousel']}
                        selected={typeFilters}
                        onChange={setTypeFilters}
                        placeholder="Тип контента"
                        allLabel="Все типы"
                    />

                    {/* Source multi-select */}
                    <MultiSelect
                        options={sources}
                        selected={sourceFilters}
                        onChange={setSourceFilters}
                        placeholder="Источники"
                        allLabel="Все источники"
                    />

                    <span className="text-sm text-muted-foreground ml-auto">
                        {filteredItems.length} из {items.length}
                    </span>
                </div>

                {/* Filters Row 2 - Range filters */}
                <div className="flex flex-wrap gap-3 items-center">
                    <span className="text-xs text-muted-foreground">Мин:</span>
                    <Input
                        placeholder="Просм."
                        value={minViews}
                        onChange={(e) => setMinViews(e.target.value.replace(/\D/g, ''))}
                        className="w-20 h-8 text-sm bg-muted border-border/50"
                    />
                    <Input
                        placeholder="Лайки"
                        value={minLikes}
                        onChange={(e) => setMinLikes(e.target.value.replace(/\D/g, ''))}
                        className="w-20 h-8 text-sm bg-muted border-border/50"
                    />
                    <Input
                        placeholder="Комм."
                        value={minComments}
                        onChange={(e) => setMinComments(e.target.value.replace(/\D/g, ''))}
                        className="w-20 h-8 text-sm bg-muted border-border/50"
                    />
                    <Input
                        placeholder="Вирал."
                        value={minVirality}
                        onChange={(e) => setMinVirality(e.target.value.replace(/[^\d.]/g, ''))}
                        className="w-16 h-8 text-sm bg-muted border-border/50"
                    />
                </div>

                {/* Table with horizontal scroll only inside, not affecting page */}
                <div className="w-full min-h-[500px] max-w-full">
                    <div className="rounded-lg border border-border/50 overflow-x-auto overflow-y-visible max-w-full">
                        <Table className="w-max min-w-full">
                            <TableHeader>
                                <TableRow className="bg-muted/50 hover:bg-muted/50">
                                    <TableHead className="w-[40px]"></TableHead>
                                    <TableHead className="w-[120px]">Источник</TableHead>
                                    <TableHead className="w-[70px] text-center">Тип</TableHead>
                                    <TableHead
                                        className="relative pr-2"
                                        style={{ width: headlineWidth, minWidth: headlineWidth, maxWidth: headlineWidth }}
                                    >
                                        Заголовок
                                        <div
                                            className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 transition-colors"
                                            onMouseDown={handleResizeStart}
                                        />
                                    </TableHead>
                                    <TableHead className="w-[120px]">AI Тема</TableHead>
                                    <TableHead
                                        className="w-[80px] text-center cursor-pointer hover:text-foreground transition-colors"
                                        onClick={() => handleSort('date')}
                                    >
                                        <span className="flex items-center justify-center gap-1">
                                            Дата <SortIcon field="date" />
                                        </span>
                                    </TableHead>
                                    <TableHead
                                        className="w-[90px] text-center cursor-pointer hover:text-foreground transition-colors"
                                        onClick={() => handleSort('views')}
                                    >
                                        <span className="flex items-center justify-center gap-1">
                                            Просм. <SortIcon field="views" />
                                        </span>
                                    </TableHead>
                                    <TableHead
                                        className="w-[70px] text-center cursor-pointer hover:text-foreground transition-colors"
                                        onClick={() => handleSort('likes')}
                                    >
                                        <span className="flex items-center justify-center gap-1">
                                            Лайки <SortIcon field="likes" />
                                        </span>
                                    </TableHead>
                                    <TableHead
                                        className="w-[80px] text-center cursor-pointer hover:text-foreground transition-colors"
                                        onClick={() => handleSort('comments')}
                                    >
                                        <span className="flex items-center justify-center gap-1">
                                            Комм. <SortIcon field="comments" />
                                        </span>
                                    </TableHead>
                                    <TableHead
                                        className="w-[80px] text-center cursor-pointer hover:text-foreground transition-colors"
                                        onClick={() => handleSort('virality')}
                                    >
                                        <span className="flex items-center justify-center gap-1">
                                            Вирал. <SortIcon field="virality" />
                                        </span>
                                    </TableHead>
                                    <TableHead className="w-[40px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredItems.slice(0, 100).map((item) => (
                                    <TableRow
                                        key={item.id}
                                        className="hover:bg-muted/30 transition-colors cursor-pointer group"
                                        onClick={() => setSelectedItem(item)}
                                    >
                                        {/* Image preview */}
                                        <TableCell className="p-2">
                                            {item.coverUrl && (
                                                <Tooltip>
                                                    <TooltipTrigger>
                                                        <Image className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                                                    </TooltipTrigger>
                                                    <TooltipContent side="right" className="p-0">
                                                        <img
                                                            src={item.coverUrl}
                                                            alt="Preview"
                                                            className="w-48 h-48 object-cover rounded"
                                                        />
                                                    </TooltipContent>
                                                </Tooltip>
                                            )}
                                        </TableCell>
                                        <TableCell className="font-medium text-sm">
                                            <span className="text-muted-foreground">@</span>{item.sourceUsername}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground text-center">
                                            {item.contentType}
                                        </TableCell>
                                        <TableCell
                                            className="overflow-hidden"
                                            style={{ width: headlineWidth, minWidth: headlineWidth, maxWidth: headlineWidth }}
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className="line-clamp-1 text-sm flex-1">
                                                    {item.headline || item.description?.slice(0, 80) || '—'}
                                                </span>
                                                {(item.headline || item.description) && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
                                                        onClick={(e) => copyText(item.headline || item.description || '', e)}
                                                    >
                                                        <Copy className="h-3 w-3" />
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                        {/* AI Topic */}
                                        <TableCell>
                                            {item.aiTopic ? (
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-medium text-primary truncate">
                                                                {item.aiTopic}
                                                            </span>
                                                            {item.aiSubtopic && (
                                                                <span className="text-[10px] text-muted-foreground truncate">
                                                                    {item.aiSubtopic}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="top" className="max-w-sm">
                                                        <div className="space-y-1">
                                                            <div><strong>Тема:</strong> {item.aiTopic}</div>
                                                            {item.aiSubtopic && <div><strong>Подтема:</strong> {item.aiSubtopic}</div>}
                                                            {item.aiHookType && <div><strong>Hook:</strong> {item.aiHookType}</div>}
                                                            {item.aiSuccessReason && <div><strong>Почему:</strong> {item.aiSuccessReason}</div>}
                                                        </div>
                                                    </TooltipContent>
                                                </Tooltip>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-center text-sm text-muted-foreground">
                                            {formatDate(item.publishedAt)}
                                        </TableCell>
                                        <TableCell className="text-center font-mono text-sm">
                                            {formatNumber(item.views)}
                                        </TableCell>
                                        <TableCell className="text-center font-mono text-sm">
                                            {formatNumber(item.likes)}
                                        </TableCell>
                                        <TableCell className="text-center font-mono text-sm">
                                            {formatNumber(item.comments)}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <span className={cn(
                                                "font-mono text-sm",
                                                (item.viralityScore || 0) > 5 ? 'text-green-400' :
                                                    (item.viralityScore || 0) > 2 ? 'text-yellow-400' : 'text-muted-foreground'
                                            )}>
                                                {item.viralityScore?.toFixed(1) || '—'}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <a
                                                href={item.originalUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-muted-foreground hover:text-foreground transition-colors"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <ExternalLink className="h-4 w-4" />
                                            </a>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>

                {filteredItems.length > 100 && (
                    <p className="text-sm text-muted-foreground text-center">
                        Показано 100 из {filteredItems.length}. Используйте фильтры для сужения поиска.
                    </p>
                )}

                {filteredItems.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                        <Icons.search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Контент не найден</p>
                    </div>
                )}

                {/* Detail Dialog */}
                <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
                    <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
                        <DialogHeader className="shrink-0">
                            <DialogTitle className="text-lg flex items-center gap-2">
                                {selectedItem?.contentType} от @{selectedItem?.sourceUsername}
                                {selectedItem?.originalUrl && (
                                    <a
                                        href={selectedItem.originalUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-muted-foreground hover:text-foreground transition-colors"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <ExternalLink className="h-4 w-4" />
                                    </a>
                                )}
                            </DialogTitle>
                        </DialogHeader>
                        {selectedItem && (
                            <div className="space-y-4 overflow-y-auto pr-2">
                                {/* Top row: Image + Stats */}
                                <div className="flex gap-4">
                                    {/* Cover image or placeholder */}
                                    <div className="w-48 h-48 shrink-0 rounded-lg overflow-hidden bg-muted/30 flex items-center justify-center">
                                        {selectedItem.coverUrl ? (
                                            <img
                                                src={selectedItem.coverUrl}
                                                alt="Cover"
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                    const parent = e.currentTarget.parentElement
                                                    if (parent) {
                                                        parent.innerHTML = '<div class="h-12 w-12 text-muted-foreground/30"><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg></div>'
                                                    }
                                                }}
                                            />
                                        ) : (
                                            <Image className="h-12 w-12 text-muted-foreground/30" />
                                        )}
                                    </div>

                                    {/* Stats 2x2 grid */}
                                    <div className="flex-1 grid grid-cols-2 gap-3">
                                        <div className="flex flex-col items-center justify-center p-3 bg-muted/30 rounded-lg">
                                            <div className="text-2xl font-bold">{formatNumber(selectedItem.views)}</div>
                                            <div className="text-xs text-muted-foreground">Просмотры</div>
                                        </div>
                                        <div className="flex flex-col items-center justify-center p-3 bg-muted/30 rounded-lg">
                                            <div className="text-2xl font-bold">{formatNumber(selectedItem.likes)}</div>
                                            <div className="text-xs text-muted-foreground">Лайки</div>
                                        </div>
                                        <div className="flex flex-col items-center justify-center p-3 bg-muted/30 rounded-lg">
                                            <div className="text-2xl font-bold">{formatNumber(selectedItem.comments)}</div>
                                            <div className="text-xs text-muted-foreground">Комменты</div>
                                        </div>
                                        <div className="flex flex-col items-center justify-center p-3 bg-muted/30 rounded-lg">
                                            <div className={cn(
                                                "text-2xl font-bold",
                                                (selectedItem.viralityScore || 0) > 5 ? 'text-green-400' :
                                                    (selectedItem.viralityScore || 0) > 2 ? 'text-yellow-400' : ''
                                            )}>
                                                {selectedItem.viralityScore?.toFixed(1) || '—'}
                                            </div>
                                            <div className="text-xs text-muted-foreground">Виральность</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Headline with copy */}
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <h4 className="text-sm font-medium text-muted-foreground">Заголовок</h4>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 text-xs shrink-0"
                                            onClick={(e) => copyText(selectedItem.headline || '', e)}
                                        >
                                            <Copy className="h-3 w-3 mr-1" /> Копировать
                                        </Button>
                                    </div>
                                    <p className="text-foreground font-medium">
                                        {selectedItem.headline || '—'}
                                    </p>
                                </div>

                                {/* Description with copy */}
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <h4 className="text-sm font-medium text-muted-foreground">Описание</h4>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 text-xs shrink-0"
                                            onClick={(e) => copyText(selectedItem.description || '', e)}
                                        >
                                            <Copy className="h-3 w-3 mr-1" /> Копировать
                                        </Button>
                                    </div>
                                    <p className="text-foreground text-sm whitespace-pre-wrap max-h-40 overflow-y-auto">
                                        {selectedItem.description || '—'}
                                    </p>
                                </div>

                                {/* AI Analysis Section */}
                                {selectedItem.aiTopic && (
                                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
                                        <h4 className="text-sm font-semibold text-primary flex items-center gap-2">
                                            🧠 AI Анализ
                                        </h4>

                                        {/* Topic & Hook Row */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <span className="text-xs text-muted-foreground">Тема</span>
                                                <p className="text-sm font-medium">{selectedItem.aiTopic}</p>
                                                {selectedItem.aiSubtopic && (
                                                    <p className="text-xs text-muted-foreground">{selectedItem.aiSubtopic}</p>
                                                )}
                                            </div>
                                            <div>
                                                <span className="text-xs text-muted-foreground">Hook Type</span>
                                                <p className="text-sm font-medium capitalize">{selectedItem.aiHookType || '—'}</p>
                                            </div>
                                        </div>

                                        {/* Formula */}
                                        {selectedItem.aiContentFormula && (
                                            <div>
                                                <span className="text-xs text-muted-foreground">Формула контента</span>
                                                <p className="text-sm">{selectedItem.aiContentFormula}</p>
                                            </div>
                                        )}

                                        {/* Success Reason */}
                                        {selectedItem.aiSuccessReason && (
                                            <div>
                                                <span className="text-xs text-muted-foreground">Почему залетело</span>
                                                <p className="text-sm text-green-400">{selectedItem.aiSuccessReason}</p>
                                            </div>
                                        )}

                                        {/* Tags & Trigger Row */}
                                        <div className="grid grid-cols-2 gap-3">
                                            {selectedItem.aiTags && (
                                                <div>
                                                    <span className="text-xs text-muted-foreground">Теги</span>
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {(() => {
                                                            try {
                                                                const tags = JSON.parse(selectedItem.aiTags)
                                                                return tags.map((tag: string, i: number) => (
                                                                    <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-muted">
                                                                        {tag}
                                                                    </span>
                                                                ))
                                                            } catch {
                                                                return <span className="text-xs">{selectedItem.aiTags}</span>
                                                            }
                                                        })()}
                                                    </div>
                                                </div>
                                            )}
                                            {selectedItem.aiEmotionalTrigger && (
                                                <div>
                                                    <span className="text-xs text-muted-foreground">Эмоц. триггер</span>
                                                    <p className="text-sm capitalize">{selectedItem.aiEmotionalTrigger}</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Target Audience */}
                                        {selectedItem.aiTargetAudience && (
                                            <div>
                                                <span className="text-xs text-muted-foreground">Целевая аудитория</span>
                                                <p className="text-sm">{selectedItem.aiTargetAudience}</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Meta */}
                                <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2 border-t border-border/50">
                                    <span>📅 {formatDate(selectedItem.publishedAt)}</span>
                                    <span>📁 {selectedItem.datasetName}</span>
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </TooltipProvider>
    )
}
