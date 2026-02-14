/**
 * Sources List Component with full parse statistics
 */

"use client"

import { useState, useEffect, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Icons } from "@/components/shared/icons"
import { forceScrapeSource, deleteTrackingSource, updateTrackingSource } from "@/actions/datasets"
import { toast } from "sonner"

interface ParseHistoryEntry {
    id: string
    startedAt: Date
    completedAt: Date | null
    status: string
    daysRange: number
    postsFound: number
    postsAdded: number
    postsSkipped: number
    postsFiltered: number
    postsArchived: number
    postsUpdated: number
    apifyRawCount: number
    error: string | null
}

interface TrackingSource {
    id: string
    url: string
    username: string | null
    isActive: boolean
    minViewsFilter: number
    minLikesFilter?: number
    fetchLimit: number
    daysLimit: number
    lastScrapedAt: Date | null
    parseFrequency?: string
    contentTypes?: string
    parseHistory?: ParseHistoryEntry[]
}

interface SourcesListProps {
    sources: TrackingSource[]
    itemCounts?: Record<string, number>
}

function formatDate(date: Date | string | null): string {
    if (!date) return '—'
    const d = new Date(date)
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' }) +
        ' ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

function getNextParseDate(lastScrapedAt: Date | string | null, frequency: string = 'weekly'): string {
    if (!lastScrapedAt) return 'Не запускался'
    const last = new Date(lastScrapedAt)
    const daysMap: Record<string, number> = { daily: 1, '3days': 3, weekly: 7 }
    const days = daysMap[frequency] || 7
    const next = new Date(last.getTime() + days * 86400000)
    const now = new Date()
    if (next < now) return 'Просрочен'
    const diffMs = next.getTime() - now.getTime()
    const diffH = Math.floor(diffMs / 3600000)
    if (diffH < 24) return `через ${diffH}ч`
    return formatDate(next)
}

function getFrequencyLabel(freq: string = 'weekly'): string {
    const map: Record<string, string> = { daily: 'Ежедневно', '3days': 'Каждые 3 дня', weekly: 'Еженедельно' }
    return map[freq] || freq
}

export function SourcesList({ sources, itemCounts = {} }: SourcesListProps) {
    const [loadingId, setLoadingId] = useState<string | null>(null)
    const [statusMessage, setStatusMessage] = useState<string>("")
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()
    const router = useRouter()

    useEffect(() => {
        const checkRunningParses = () => {
            const runningSource = sources.find(s =>
                s.parseHistory &&
                s.parseHistory.length > 0 &&
                s.parseHistory[0].status === 'running'
            )
            if (runningSource) {
                setLoadingId(runningSource.id)
                setStatusMessage("Парсинг в процессе...")
            } else if (loadingId) {
                setLoadingId(null)
                setStatusMessage("")
            }
        }
        checkRunningParses()
        const interval = setInterval(checkRunningParses, 3000)
        return () => clearInterval(interval)
    }, [sources, loadingId])

    const handleScrape = (sourceId: string) => {
        setLoadingId(sourceId)
        setStatusMessage("Сканирую профиль...")
        startTransition(async () => {
            try {
                const result = await forceScrapeSource(sourceId)
                if (!result) throw new Error("Не удалось получить результат парсинга")

                setStatusMessage(`Готово! Сохранено: ${result.saved}`)
                if (result.saved > 0) {
                    toast.success(`✅ Сохранено: ${result.saved} постов`, { description: `Найдено: ${result.fetched}` })
                } else if (result.fetched === 0) {
                    toast.error("❌ Посты не найдены", { description: "Проверьте URL профиля" })
                } else {
                    const reasons = result.skipReasons.slice(0, 3).map((r: any) => `${r.reason}: ${r.count}`).join(", ")
                    toast.warning(`⚠️ Найдено ${result.fetched}, все пропущены`, { description: reasons })
                }
                if (result.errors.length > 0) toast.error(`Ошибка: ${result.errors[0]}`)
                router.refresh()
            } catch (error) {
                setStatusMessage("Ошибка")
                toast.error(error instanceof Error ? error.message : "Ошибка при парсинге")
            } finally {
                setTimeout(() => { setLoadingId(null); setStatusMessage("") }, 2000)
            }
        })
    }

    const handleToggleActive = (source: TrackingSource) => {
        startTransition(async () => {
            try {
                await updateTrackingSource(source.id, { isActive: !source.isActive })
                router.refresh()
            } catch { toast.error("Ошибка обновления") }
        })
    }

    const handleDelete = (sourceId: string) => {
        if (!confirm("Удалить источник?")) return
        startTransition(async () => {
            try {
                await deleteTrackingSource(sourceId)
                toast.success("Источник удален")
                router.refresh()
            } catch { toast.error("Ошибка удаления") }
        })
    }

    if (sources.length === 0) {
        return (
            <div className="text-center py-12 border rounded-lg bg-muted/50">
                <Icons.link className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Нет источников</h3>
                <p className="text-muted-foreground">Добавьте Instagram профили для парсинга</p>
            </div>
        )
    }

    return (
        <div className="space-y-3">
            {sources.map((source) => {
                const latest = source.parseHistory?.[0]
                const isExpanded = expandedId === source.id
                const count = source.username ? itemCounts[source.username] : undefined

                return (
                    <Card
                        key={source.id}
                        className={`${loadingId === source.id ? "border-primary/50 bg-primary/5" : ""} group cursor-pointer transition-colors`}

                    >
                        <CardContent className="py-4">
                            {/* Main row */}
                            <div className="flex items-center justify-between" onClick={() => setExpandedId(isExpanded ? null : source.id)}>
                                <div className="flex items-center gap-4">
                                    <Switch
                                        checked={source.isActive}
                                        onCheckedChange={() => handleToggleActive(source)}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium">@{source.username}</p>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <a
                                                    href={source.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-muted-foreground hover:text-primary transition-colors"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <Icons.externalLink className="h-3 w-3" />
                                                </a>
                                            </div>
                                        </div>

                                        {/* Quick stats line */}
                                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                                            {count !== undefined && (
                                                <span>📊 <span className="font-medium text-foreground">{count}</span> постов</span>
                                            )}
                                            {latest && latest.status === 'completed' && (
                                                <>
                                                    <span>
                                                        последний: <span className="font-medium text-foreground">{formatDate(latest.completedAt || latest.startedAt)}</span>
                                                    </span>
                                                    {(latest.postsAdded > 0 || latest.postsUpdated > 0) && (
                                                        <span>
                                                            {latest.postsAdded > 0 && (
                                                                <span className="text-green-400 font-medium">+{latest.postsAdded} новых</span>
                                                            )}
                                                            {latest.postsAdded > 0 && latest.postsUpdated > 0 && ' / '}
                                                            {latest.postsUpdated > 0 && (
                                                                <span className="text-blue-400 font-medium">↻{latest.postsUpdated} обновлено</span>
                                                            )}
                                                        </span>
                                                    )}
                                                </>
                                            )}
                                            <span>
                                                след: <span className="font-medium text-foreground">{getNextParseDate(source.lastScrapedAt, source.parseFrequency)}</span>
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                    <Button
                                        size="sm"
                                        variant={loadingId === source.id ? "default" : "outline"}
                                        onClick={() => handleScrape(source.id)}
                                        disabled={loadingId !== null || isPending}
                                        className={loadingId === source.id ? "min-w-[140px]" : ""}
                                    >
                                        {loadingId === source.id ? (
                                            <>
                                                <Icons.spinner className="h-4 w-4 animate-spin mr-2" />
                                                <span className="text-xs">{statusMessage}</span>
                                            </>
                                        ) : (
                                            <>
                                                <Icons.refresh className="h-4 w-4 mr-2" />
                                                Парсить
                                            </>
                                        )}
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleDelete(source.id)}
                                        disabled={loadingId === source.id}
                                    >
                                        <Icons.trash className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>
                            </div>

                            {/* Expanded details */}
                            {isExpanded && (
                                <div className="mt-4 pt-3 border-t border-border/50 space-y-3">
                                    {/* Settings row */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                                        <div className="bg-muted/30 rounded-md p-2">
                                            <div className="text-muted-foreground">Период</div>
                                            <div className="font-medium text-foreground">{source.daysLimit} дней</div>
                                        </div>
                                        <div className="bg-muted/30 rounded-md p-2">
                                            <div className="text-muted-foreground">Мин. просмотры</div>
                                            <div className="font-medium text-foreground">
                                                {source.minViewsFilter > 0 ? source.minViewsFilter.toLocaleString('ru-RU') : 'Все'}
                                            </div>
                                        </div>
                                        <div className="bg-muted/30 rounded-md p-2">
                                            <div className="text-muted-foreground">Частота</div>
                                            <div className="font-medium text-foreground">{getFrequencyLabel(source.parseFrequency)}</div>
                                        </div>
                                        <div className="bg-muted/30 rounded-md p-2">
                                            <div className="text-muted-foreground">Типы контента</div>
                                            <div className="font-medium text-foreground">
                                                {(source.contentTypes || 'Video').split(',').map(t =>
                                                    t === 'Video' ? 'Reels' : t === 'Sidecar' ? 'Карусели' : t
                                                ).join(', ')}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Parse history */}
                                    {source.parseHistory && source.parseHistory.length > 0 && (
                                        <div>
                                            <div className="text-xs font-medium text-muted-foreground mb-2">История парсинга</div>
                                            <div className="space-y-1.5">
                                                {source.parseHistory.map((h) => (
                                                    <div key={h.id} className="flex items-center gap-3 text-xs bg-muted/20 rounded-md px-3 py-1.5">
                                                        <span className={
                                                            h.status === 'completed' ? 'text-green-500' :
                                                                h.status === 'failed' ? 'text-red-500' :
                                                                    'text-yellow-500'
                                                        }>
                                                            {h.status === 'completed' ? '✅' : h.status === 'failed' ? '❌' : '⏳'}
                                                        </span>
                                                        <span className="text-muted-foreground">{formatDate(h.startedAt)}</span>
                                                        <span className="text-muted-foreground">•</span>
                                                        <span>Найдено: <span className="font-medium text-foreground">{h.postsFound}</span></span>
                                                        <span className="text-muted-foreground">•</span>
                                                        <span>Добавлено: <span className="font-medium text-green-400">{h.postsAdded}</span></span>
                                                        {h.postsFiltered > 0 && (
                                                            <>
                                                                <span className="text-muted-foreground">•</span>
                                                                <span>Отфильтровано: <span className="font-medium text-yellow-400">{h.postsFiltered}</span></span>
                                                            </>
                                                        )}
                                                        {h.postsUpdated > 0 && (
                                                            <>
                                                                <span className="text-muted-foreground">•</span>
                                                                <span>Обновлено: <span className="font-medium">{h.postsUpdated}</span></span>
                                                            </>
                                                        )}
                                                        {h.error && (
                                                            <span className="text-red-400 truncate max-w-[200px]" title={h.error}>
                                                                {h.error}
                                                            </span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )
            })}
        </div>
    )
}
