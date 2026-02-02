/**
 * Dataset Tabs Component
 * 
 * Client component that handles auto-refresh and counter updates
 */

"use client"

import { useEffect, useState, useCallback, useRef, useTransition } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Icons } from "@/components/shared/icons"
import { ContentItemsTable } from "@/components/datasets/content-items-table"
import { SourcesList } from "@/components/datasets/sources-list"
import { AddSourceDialog } from "@/components/datasets/add-source-dialog"

import { reprocessDatasetHeadlines } from "@/actions/datasets"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

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
    viralityScore: number | null
}

interface TrackingSource {
    id: string
    url: string
    username: string | null
    isActive: boolean
    minViewsFilter: number
    fetchLimit: number
    daysLimit: number
    lastScrapedAt: Date | null
}

interface DatasetTabsProps {
    datasetId: string
    initialItems: ContentItem[]
    sources: TrackingSource[]
}

export function DatasetTabs({ datasetId, initialItems, sources }: DatasetTabsProps) {
    const [items, setItems] = useState(initialItems)
    const [daysFilter, setDaysFilter] = useState<number | null>(14)
    const [minViews, setMinViews] = useState<string>("")
    const [minLikes, setMinLikes] = useState<string>("")
    const intervalRef = useRef<NodeJS.Timeout | null>(null)
    const [isPending, startTransition] = useTransition()

    // Count items needing reprocessing
    const needsReprocessCount = items.filter(item => !item.headline || item.processingError).length

    const handleReprocess = () => {
        startTransition(async () => {
            try {
                const result = await reprocessDatasetHeadlines(datasetId)
                toast.success(`Обработано ${result.processed} из ${result.processed + result.errors.length} элементов`)
                if (result.errors.length > 0) {
                    toast.error(`Ошибки: ${result.errors.length}`)
                }
            } catch (error) {
                toast.error("Ошибка обработки")
            }
        })
    }

    // Fetch ALL items (no date filter)
    const fetchItems = useCallback(async () => {
        try {
            const response = await fetch(`/api/datasets/${datasetId}/items`, {
                cache: "no-store"
            })
            if (response.ok) {
                const data = await response.json()
                setItems(data.items)
            }
        } catch (error) {
            console.error("Failed to fetch items:", error)
        }
    }, [datasetId])

    // Start polling automatically
    useEffect(() => {
        intervalRef.current = setInterval(fetchItems, 3000)

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
            }
        }
    }, [fetchItems])

    // Update items when initialItems change
    useEffect(() => {
        setItems(initialItems)
    }, [initialItems])

    // Apply filters for DISPLAY (user can filter)
    const filteredItems = items.filter((item) => {
        // Date filter
        if (daysFilter && item.publishedAt) {
            const publishedDate = new Date(item.publishedAt)
            const daysAgo = new Date()
            daysAgo.setDate(daysAgo.getDate() - daysFilter)
            if (publishedDate < daysAgo) return false
        }

        // Views filter
        if (minViews && parseInt(minViews) > 0) {
            if (item.views < parseInt(minViews)) return false
        }

        // Likes filter
        if (minLikes && parseInt(minLikes) > 0) {
            if (item.likes < parseInt(minLikes)) return false
        }

        return true
    })

    return (
        <Tabs defaultValue="content" className="space-y-4">
            <div className="flex items-center justify-between">
                <TabsList>
                    <TabsTrigger value="content" className="gap-2">
                        <Icons.fileText className="h-4 w-4" />
                        Контент ({items.length})
                    </TabsTrigger>
                    <TabsTrigger value="sources" className="gap-2">
                        <Icons.link className="h-4 w-4" />
                        Источники ({sources.length})
                    </TabsTrigger>
                </TabsList>

            </div>

            <TabsContent value="content" className="space-y-4">
                {/* Compact Filter Panel - Only Views/Likes */}
                <div className="flex flex-wrap items-center gap-4 p-4 rounded-lg border bg-card">

                    {/* Time Period Filter */}
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium whitespace-nowrap">Период:</span>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setDaysFilter(null)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${daysFilter === null
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-secondary hover:bg-secondary/80"
                                    }`}
                            >
                                Все
                            </button>
                            <button
                                onClick={() => setDaysFilter(7)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${daysFilter === 7
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-secondary hover:bg-secondary/80"
                                    }`}
                            >
                                7 дней
                            </button>
                            <button
                                onClick={() => setDaysFilter(14)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${daysFilter === 14
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-secondary hover:bg-secondary/80"
                                    }`}
                            >
                                14 дней
                            </button>
                        </div>
                    </div>

                    <div className="h-6 w-px bg-border hidden sm:block" />

                    {/* Views Filter */}
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium whitespace-nowrap">Просмотры:</span>
                        <input
                            type="number"
                            value={minViews}
                            onChange={(e) => setMinViews(e.target.value)}
                            placeholder="> 10k"
                            className="w-24 px-2 py-1.5 text-xs rounded-md border bg-background"
                        />
                    </div>

                    {/* Likes Filter */}
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium whitespace-nowrap">Лайки:</span>
                        <input
                            type="number"
                            value={minLikes}
                            onChange={(e) => setMinLikes(e.target.value)}
                            placeholder="> 500"
                            className="w-24 px-2 py-1.5 text-xs rounded-md border bg-background"
                        />
                    </div>

                    <div className="flex-1" />

                    {/* Reset & Summary */}
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground whitespace-nowrap">
                            <span className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                                Auto
                            </span>
                            <span>•</span>
                            <span>{filteredItems.length} шт.</span>
                        </div>

                        {needsReprocessCount > 0 && (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={handleReprocess}
                                disabled={isPending}
                                className="text-xs"
                            >
                                {isPending ? (
                                    <><Icons.spinner className="h-3 w-3 animate-spin mr-1" /> Обработка...</>
                                ) : (
                                    <><Icons.refresh className="h-3 w-3 mr-1" /> Заголовки ({needsReprocessCount})</>
                                )}
                            </Button>
                        )}

                        <button
                            onClick={() => {
                                setDaysFilter(14)
                                setMinViews("")
                                setMinLikes("")
                            }}
                            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4"
                        >
                            Сбросить
                        </button>
                    </div>
                </div>

                <ContentItemsTable items={filteredItems} />
            </TabsContent>

            <TabsContent value="sources" className="space-y-4">
                <div className="flex justify-end">
                    <AddSourceDialog datasetId={datasetId} />
                </div>
                <SourcesList sources={sources} />
            </TabsContent>
        </Tabs >
    )
}
