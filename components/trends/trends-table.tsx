/**
 * Trends Table Component
 * Displays all content items with filters and sorting
 */

"use client"

import { useState, useMemo, useEffect } from "react"
import { ExternalLink, ChevronUp, ChevronDown, Image, Copy, ArrowUp } from "lucide-react"
import { Icons } from "@/components/shared/icons"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { MultiSelect } from "@/components/ui/multi-select"
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
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { ContentDetailDialog, getProxyImageUrl } from "@/components/shared/content-detail-dialog"


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
    createdAt?: Date | null
    updatedAt?: Date | null
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
    hideDatasetFilter?: boolean
}

type SortField = 'views' | 'likes' | 'comments' | 'virality' | 'date'
type SortOrder = 'asc' | 'desc'



export function TrendsTable({ items, hideDatasetFilter }: TrendsTableProps) {
    const [search, setSearch] = useState("")

    const [sourceFilters, setSourceFilters] = useState<Set<string>>(new Set())
    const [topicFilters, setTopicFilters] = useState<Set<string>>(new Set())
    const [datasetFilters, setDatasetFilters] = useState<Set<string>>(new Set())
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
    const [datePreset, setDatePreset] = useState<string | null>(null)



    // Get unique sources
    const sources = useMemo(() => {
        const uniqueSources = Array.from(new Set(items.map(i => i.sourceUsername)))
        return uniqueSources.filter(s => s !== 'unknown').sort()
    }, [items])

    // Get unique topics
    const topics = useMemo(() => {
        const uniqueTopics = Array.from(new Set(items.map(i => i.aiTopic).filter(Boolean) as string[]))
        return uniqueTopics.sort()
    }, [items])

    // Get unique datasets
    const datasets = useMemo(() => {
        const uniqueDatasets = Array.from(new Set(items.map(i => i.datasetName)))
        return uniqueDatasets.filter(Boolean).sort()
    }, [items])

    // Initialize filters to include all
    useEffect(() => {
        if (sourceFilters.size === 0 && sources.length > 0) {
            setSourceFilters(new Set(sources))
        }
    }, [sources])

    useEffect(() => {
        if (topicFilters.size === 0 && topics.length > 0) {
            setTopicFilters(new Set(topics))
        }
    }, [topics])

    // Removed auto-select all datasets effect per user request

    // Date preset helper
    const applyDatePreset = (days: number, presetName: string) => {
        const from = new Date()
        from.setDate(from.getDate() - days)
        setDateFrom(from.toISOString().split('T')[0])
        setDateTo('')
        setDatePreset(presetName)
    }

    const clearDatePreset = () => {
        setDateFrom('')
        setDateTo('')
        setDatePreset(null)
    }

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



        // Source filter
        if (sourceFilters.size > 0 && sourceFilters.size < sources.length) {
            result = result.filter(item => sourceFilters.has(item.sourceUsername))
        }

        // Topic filter
        if (topicFilters.size > 0 && topicFilters.size < topics.length) {
            result = result.filter(item => item.aiTopic && topicFilters.has(item.aiTopic))
        }

        // Dataset filter
        if (datasetFilters.size > 0 && datasetFilters.size < datasets.length) {
            result = result.filter(item => datasetFilters.has(item.datasetName))
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
    }, [items, search, sourceFilters, sources.length, topicFilters, topics.length, datasetFilters, datasets.length, sortField, sortOrder, minViews, minLikes, minVirality, minComments, dateFrom, dateTo])

    const formatNumber = (num: number) => {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
        return num.toString()
    }

    // Check if item was updated (updatedAt > createdAt + 60s)
    const isUpdated = (item: ContentItem): boolean => {
        if (!item.updatedAt || !item.createdAt) return false
        const created = new Date(item.createdAt).getTime()
        const updated = new Date(item.updatedAt).getTime()
        return (updated - created) > 60_000
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




                    {/* Source multi-select */}
                    <MultiSelect
                        options={sources}
                        selected={sourceFilters}
                        onChange={setSourceFilters}
                        placeholder="Источники"
                        allLabel="Все источники"
                    />

                    {/* Topic multi-select */}
                    <MultiSelect
                        options={topics}
                        selected={topicFilters}
                        onChange={setTopicFilters}
                        placeholder="Темы"
                        allLabel="Все темы"
                    />

                    {/* Dataset multi-select */}
                    {!hideDatasetFilter && (
                        <MultiSelect
                            options={datasets}
                            selected={datasetFilters}
                            onChange={setDatasetFilters}
                            placeholder="Датасеты"
                            allLabel="Все датасеты"
                        />
                    )}

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

                    <div className="w-px h-5 bg-border/50 mx-1" />

                    {/* Date presets */}
                    <button
                        onClick={() => datePreset === '7d' ? clearDatePreset() : applyDatePreset(7, '7d')}
                        className={cn(
                            "h-8 px-3 text-xs rounded-md border transition-colors",
                            datePreset === '7d'
                                ? "bg-foreground text-background border-foreground"
                                : "bg-muted border-border/50 hover:bg-muted/80 text-muted-foreground"
                        )}
                    >
                        7 дней
                    </button>
                    <button
                        onClick={() => datePreset === '14d' ? clearDatePreset() : applyDatePreset(14, '14d')}
                        className={cn(
                            "h-8 px-3 text-xs rounded-md border transition-colors",
                            datePreset === '14d'
                                ? "bg-foreground text-background border-foreground"
                                : "bg-muted border-border/50 hover:bg-muted/80 text-muted-foreground"
                        )}
                    >
                        14 дней
                    </button>

                    <span className="text-xs text-muted-foreground">Дата:</span>
                    <Input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => { setDateFrom(e.target.value); setDatePreset(null) }}
                        className="w-36 h-8 text-sm bg-muted border-border/50"
                        title="От даты"
                    />
                    <span className="text-xs text-muted-foreground">—</span>
                    <Input
                        type="date"
                        value={dateTo}
                        onChange={(e) => { setDateTo(e.target.value); setDatePreset(null) }}
                        className="w-36 h-8 text-sm bg-muted border-border/50"
                        title="До даты"
                    />
                </div>

                {/* Table with horizontal scroll only inside, not affecting page */}
                <div className="w-full min-h-[500px] max-w-full">
                    <div className="rounded-lg border border-border/50 overflow-x-auto overflow-y-visible max-w-full">
                        <Table className="w-max min-w-full">
                            <TableHeader>
                                <TableRow className="bg-muted/50 hover:bg-muted/50">
                                    <TableHead className="w-[40px] text-center text-xs">#</TableHead>
                                    <TableHead className="w-[40px]"></TableHead>
                                    <TableHead className="w-[110px]">Источник</TableHead>
                                    <TableHead className="w-[120px]">Тема</TableHead>
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
                                    <TableHead className="min-w-[200px]">Заголовок</TableHead>
                                    <TableHead className="w-[40px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredItems.slice(0, 100).map((item, index) => (
                                    <TableRow
                                        key={item.id}
                                        className="hover:bg-muted/30 transition-colors cursor-pointer group"
                                        onClick={() => setSelectedItem(item)}
                                    >
                                        {/* Row number + updated dot */}
                                        <TableCell className="p-2 text-center text-xs text-muted-foreground font-mono">
                                            <span className="flex items-center justify-center gap-0.5">
                                                {index + 1}
                                                {isUpdated(item) && (
                                                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" title="Обновлено" />
                                                )}
                                            </span>
                                        </TableCell>
                                        {/* Thumbnail with hover preview */}
                                        <TableCell className="p-1">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <button
                                                        className="block focus:outline-none"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            setSelectedItem(item)
                                                        }}
                                                    >
                                                        {item.coverUrl ? (
                                                            <img
                                                                src={getProxyImageUrl(item.coverUrl)}
                                                                alt=""
                                                                className="w-8 h-8 rounded object-cover hover:ring-2 hover:ring-primary/50 transition-all cursor-pointer"
                                                                onError={(e) => {
                                                                    const parent = e.currentTarget.parentElement
                                                                    if (parent) {
                                                                        e.currentTarget.style.display = 'none'
                                                                        const fallback = document.createElement('div')
                                                                        fallback.className = 'w-8 h-8 rounded bg-muted/30 flex items-center justify-center'
                                                                        fallback.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-muted-foreground/40"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>'
                                                                        parent.appendChild(fallback)
                                                                    }
                                                                }}
                                                            />
                                                        ) : (
                                                            <div className="w-8 h-8 rounded bg-muted/30 flex items-center justify-center">
                                                                <Image className="h-3 w-3 text-muted-foreground/40" />
                                                            </div>
                                                        )}
                                                    </button>
                                                </TooltipTrigger>
                                                {item.coverUrl && (
                                                    <TooltipContent side="right" className="p-0">
                                                        <img
                                                            src={getProxyImageUrl(item.coverUrl)}
                                                            alt="Preview"
                                                            className="w-[300px] h-[300px] object-cover rounded"
                                                            onError={(e) => {
                                                                e.currentTarget.parentElement!.style.display = 'none'
                                                            }}
                                                        />
                                                    </TooltipContent>
                                                )}
                                            </Tooltip>
                                        </TableCell>
                                        {/* Source username + link */}
                                        <TableCell className="p-1">
                                            <a
                                                href={`https://instagram.com/${item.sourceUsername}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <span className="opacity-50">@</span>
                                                <span className="truncate max-w-[90px]">{item.sourceUsername}</span>
                                            </a>
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
                                        {/* Date */}
                                        <TableCell className="text-center text-sm text-muted-foreground">
                                            {formatDate(item.publishedAt)}
                                        </TableCell>
                                        {/* Stats */}
                                        <TableCell className="text-center font-mono text-sm">
                                            <span className="inline-flex items-center gap-0.5">
                                                {formatNumber(item.views)}
                                                {isUpdated(item) && (
                                                    <ArrowUp className="h-3 w-3 text-cyan-400" />
                                                )}
                                            </span>
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
                                        {/* Headline */}
                                        <TableCell>
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

                                        {/* External link */}
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
                <ContentDetailDialog item={selectedItem} onClose={() => setSelectedItem(null)} />
            </div>
        </TooltipProvider>
    )
}
