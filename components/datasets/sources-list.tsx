/**
 * Sources List Component with Apify Status
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

interface TrackingSource {
    id: string
    url: string
    username: string | null
    isActive: boolean
    minViewsFilter: number
    fetchLimit: number
    daysLimit: number
    lastScrapedAt: Date | null
    parseHistory?: Array<{
        id: string
        startedAt: Date
        completedAt: Date | null
        status: string
        daysRange: number
        postsAdded: number
        postsFound?: number
        error: string | null
    }>
}

interface SourcesListProps {
    sources: TrackingSource[]
}



export function SourcesList({ sources }: SourcesListProps) {
    const [loadingId, setLoadingId] = useState<string | null>(null)
    const [statusMessage, setStatusMessage] = useState<string>("")
    const [isPending, startTransition] = useTransition()
    const router = useRouter()

    // Poll for running parses to restore state after navigation
    useEffect(() => {
        const checkRunningParses = () => {
            // Find any source with a running parse
            const runningSource = sources.find(s =>
                s.parseHistory &&
                s.parseHistory.length > 0 &&
                s.parseHistory[0].status === 'running'
            )

            if (runningSource) {
                setLoadingId(runningSource.id)
                setStatusMessage("Парсинг в процессе...")
            } else if (loadingId) {
                // Parse completed while we were away
                setLoadingId(null)
                setStatusMessage("")
            }
        }

        // Check immediately on mount
        checkRunningParses()

        // Poll every 3 seconds
        const interval = setInterval(checkRunningParses, 3000)
        return () => clearInterval(interval)
    }, [sources, loadingId])

    const handleScrape = (sourceId: string) => {
        setLoadingId(sourceId)
        setStatusMessage("Сканирую профиль...")
        startTransition(async () => {
            try {
                const result = await forceScrapeSource(sourceId)

                if (!result) {
                    throw new Error("Не удалось получить результат парсинга")
                }

                setStatusMessage(`Готово! Сохранено: ${result.saved}`)

                if (result.saved > 0) {
                    toast.success(`✅ Сохранено: ${result.saved} постов`, {
                        description: `Найдено: ${result.fetched}`
                    })
                } else if (result.fetched === 0) {
                    toast.error("❌ Посты не найдены", {
                        description: "Проверьте URL профиля или попробуйте позже"
                    })
                } else {
                    const reasons = result.skipReasons
                        .slice(0, 3)
                        .map(r => `${r.reason}: ${r.count}`)
                        .join(", ")
                    toast.warning(`⚠️ Найдено ${result.fetched} постов, но все пропущены`, {
                        description: reasons
                    })
                }

                if (result.errors.length > 0) {
                    toast.error(`Ошибка: ${result.errors[0]}`)
                }

                router.refresh()
            } catch (error) {
                setStatusMessage("Ошибка")
                toast.error(error instanceof Error ? error.message : "Ошибка при парсинге")
            } finally {
                setTimeout(() => {
                    setLoadingId(null)
                    setStatusMessage("")
                }, 2000)
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


            {sources.map((source) => (
                <Card key={source.id} className={loadingId === source.id ? "border-primary/50 bg-primary/5 group" : "group"}>
                    <CardContent className="flex items-center justify-between py-4">
                        <div className="flex items-center gap-4">
                            <Switch
                                checked={source.isActive}
                                onCheckedChange={() => handleToggleActive(source)}
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
                                            title="Открыть в Instagram"
                                        >
                                            <Icons.externalLink className="h-3 w-3" />
                                        </a>
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(source.url)
                                                toast.success("Ссылка скопирована")
                                            }}
                                            className="text-muted-foreground hover:text-primary transition-colors"
                                            title="Скопировать ссылку"
                                        >
                                            <Icons.copy className="h-3 w-3" />
                                        </button>
                                    </div>
                                </div>

                                {/* Parse History - Latest */}
                                {source.parseHistory && source.parseHistory.length > 0 && (() => {
                                    const latest = source.parseHistory[0]
                                    const isSuccess = latest.status === 'completed'
                                    const isFailed = latest.status === 'failed'

                                    return (
                                        <p className="text-xs mt-1 text-muted-foreground">
                                            <span className="font-medium text-foreground">Период:</span> {source.daysLimit}д
                                            <span className="mx-2">•</span>
                                            <span className="font-medium text-foreground">Мин. просмотры:</span> {source.minViewsFilter > 0 ? source.minViewsFilter.toLocaleString('ru-RU') : 'Все'}
                                            <span className="mx-2">•</span>
                                            <span className={isSuccess && latest.postsAdded > 0 ? "text-green-600 font-medium" : "font-medium"}>
                                                Найдено: {latest.postsFound ?? 0}
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
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}
