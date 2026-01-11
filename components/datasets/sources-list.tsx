/**
 * Sources List Component
 */

"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Icons } from "@/components/shared/icons"
import { forceScrapeSource, deleteTrackingSource, updateTrackingSource } from "@/actions/datasets"
import { toast } from "sonner"

interface TrackingSource {
    id: string
    url: string
    username: string | null
    isActive: boolean
    minViewsFilter: number
    fetchLimit: number
    lastScrapedAt: Date | null
    parseHistory?: Array<{
        id: string
        startedAt: Date
        completedAt: Date | null
        status: string
        daysRange: number
        postsAdded: number
        error: string | null
    }>
}

interface SourcesListProps {
    sources: TrackingSource[]
}

export function SourcesList({ sources }: SourcesListProps) {
    const [loadingId, setLoadingId] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()
    const router = useRouter()

    const handleScrape = (sourceId: string) => {
        setLoadingId(sourceId)
        startTransition(async () => {
            try {
                const result = await forceScrapeSource(sourceId)

                if (!result) {
                    throw new Error("Не удалось получить результат парсинга")
                }

                if (result.saved > 0) {
                    toast.success(`Сохранено: ${result.saved} постов`)
                } else if (result.fetched === 0) {
                    toast.error("Посты не найдены. Проверьте URL профиля.")
                } else {
                    // Show why posts were skipped
                    const reasons = result.skipReasons
                        .slice(0, 3)
                        .map(r => `${r.reason}: ${r.count}`)
                        .join(", ")
                    toast.warning(`Найдено ${result.fetched} постов, но все пропущены: ${reasons}`)
                }

                if (result.errors.length > 0) {
                    toast.error(`Ошибки: ${result.errors[0]}`)
                }

                router.refresh()
            } catch (error) {
                toast.error(error instanceof Error ? error.message : "Ошибка при парсинге")
            } finally {
                setLoadingId(null)
            }
        })
    }

    const handleToggleActive = (source: TrackingSource) => {
        startTransition(async () => {
            try {
                await updateTrackingSource(source.id, { isActive: !source.isActive })
                router.refresh()
            } catch (error) {
                toast.error("Ошибка обновления")
            }
        })
    }

    const handleDelete = (sourceId: string) => {
        if (!confirm("Удалить источник?")) return

        startTransition(async () => {
            try {
                await deleteTrackingSource(sourceId)
                toast.success("Источник удален")
                router.refresh()
            } catch (error) {
                toast.error("Ошибка удаления")
            }
        })
    }

    if (sources.length === 0) {
        return (
            <div className="text-center py-12 border rounded-lg bg-muted/50">
                <Icons.link className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Нет источников</h3>
                <p className="text-muted-foreground">
                    Добавьте Instagram профили для парсинга
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-3">
            {/* Parsing Indicator Banner */}
            {loadingId && (
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 flex items-center gap-3">
                    <Icons.spinner className="h-5 w-5 animate-spin text-primary" />
                    <div>
                        <p className="font-medium text-primary">Идёт парсинг...</p>
                        <p className="text-sm text-muted-foreground">
                            Собираем посты из Instagram. Это может занять 1-2 минуты.
                        </p>
                    </div>
                </div>
            )}

            {sources.map((source) => (
                <Card key={source.id} className={loadingId === source.id ? "border-primary/50 bg-primary/5" : ""}>
                    <CardContent className="flex items-center justify-between py-4">
                        <div className="flex items-center gap-4">
                            <Switch
                                checked={source.isActive}
                                onCheckedChange={() => handleToggleActive(source)}
                            />
                            <div>
                                <p className="font-medium">@{source.username}</p>
                                <p className="text-sm text-muted-foreground">
                                    Min views: {source.minViewsFilter.toLocaleString()} |
                                    Limit: {source.fetchLimit}
                                </p>
                                {/* Parse History - Latest */}
                                {source.parseHistory && source.parseHistory.length > 0 && (() => {
                                    const latest = source.parseHistory[0]
                                    const isSuccess = latest.status === 'completed'
                                    const isFailed = latest.status === 'failed'

                                    return (
                                        <p className="text-xs mt-1 flex items-center gap-1">
                                            <span className={isSuccess ? "text-green-600" : isFailed ? "text-red-600" : "text-muted-foreground"}>
                                                Парсинг: {new Date(latest.startedAt).toLocaleDateString('ru-RU', {
                                                    day: 'numeric',
                                                    month: 'short',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                                {isSuccess && latest.postsAdded > 0 && (
                                                    <span className="font-medium"> (+{latest.postsAdded} постов)</span>
                                                )}
                                                {isFailed && latest.error && (
                                                    <span className="font-medium"> (Ошибка)</span>
                                                )}
                                            </span>
                                        </p>
                                    )
                                })()}
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                variant={loadingId === source.id ? "default" : "outline"}
                                onClick={() => handleScrape(source.id)}
                                disabled={loadingId === source.id || isPending}
                            >
                                {loadingId === source.id ? (
                                    <>
                                        <Icons.spinner className="h-4 w-4 animate-spin mr-2" />
                                        Парсинг...
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
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}
