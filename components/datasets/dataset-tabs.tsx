/**
 * Dataset Tabs Component
 * 
 * Client component that handles auto-refresh and counter updates
 */

"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Icons } from "@/components/shared/icons"
import { ContentItemsTable } from "@/components/datasets/content-items-table"
import { SourcesList } from "@/components/datasets/sources-list"
import { AddSourceDialog } from "@/components/datasets/add-source-dialog"

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

interface TrackingSource {
    id: string
    url: string
    username: string | null
    isActive: boolean
    minViewsFilter: number
    fetchLimit: number
    lastScrapedAt: Date | null
}

interface DatasetTabsProps {
    datasetId: string
    initialItems: ContentItem[]
    sources: TrackingSource[]
}

export function DatasetTabs({ datasetId, initialItems, sources }: DatasetTabsProps) {
    const [items, setItems] = useState(initialItems)
    const [daysFilter, setDaysFilter] = useState<number | null>(30) // Default 30 days, null removed from UI
    const [minViews, setMinViews] = useState<string>("")
    const [minLikes, setMinLikes] = useState<string>("")
    const intervalRef = useRef<NodeJS.Timeout | null>(null)

    // Fetch latest items with filter
    const fetchItems = useCallback(async () => {
        try {
            const url = daysFilter
                ? `/api/datasets/${datasetId}/items?days=${daysFilter}`
                : `/api/datasets/${datasetId}/items`

            const response = await fetch(url, {
                cache: "no-store"
            })
            if (response.ok) {
                const data = await response.json()
                setItems(data.items)
            }
        } catch (error) {
            console.error("Failed to fetch items:", error)
        }
    }, [datasetId, daysFilter])

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

    // Apply all filters on frontend
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
            <TabsList>
                <TabsTrigger value="content" className="gap-2">
                    <Icons.fileText className="h-4 w-4" />
                    Контент ({filteredItems.length})
                </TabsTrigger>
                <TabsTrigger value="sources" className="gap-2">
                    <Icons.link className="h-4 w-4" />
                    Источники ({sources.length})
                </TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="space-y-4">
                {/* Comprehensive Filter Panel */}
                <div className="space-y-4 p-4 rounded-lg border bg-card">
                    <div className="flex items-center justify-between">
                        <h3 className="font-medium">Фильтры</h3>
                        <button
                            onClick={() => {
                                setDaysFilter(30)
                                setMinViews("")
                                setMinLikes("")
                            }}
                            className="text-sm text-muted-foreground hover:text-foreground"
                        >
                            Сбросить
                        </button>
                    </div>

                    {/* Time Period Filter */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Период</label>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setDaysFilter(7)}
                                className={`px-3 py-1.5 text-sm rounded-md transition ${daysFilter === 7
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-secondary hover:bg-secondary/80"
                                    }`}
                            >
                                7 дней
                            </button>
                            <button
                                onClick={() => setDaysFilter(14)}
                                className={`px-3 py-1.5 text-sm rounded-md transition ${daysFilter === 14
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-secondary hover:bg-secondary/80"
                                    }`}
                            >
                                14 дней
                            </button>
                            <button
                                onClick={() => setDaysFilter(30)}
                                className={`px-3 py-1.5 text-sm rounded-md transition ${daysFilter === 30
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-secondary hover:bg-secondary/80"
                                    }`}
                            >
                                30 дней
                            </button>
                        </div>
                    </div>

                    {/* Views and Likes Filters */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Минимум просмотров</label>
                            <input
                                type="number"
                                value={minViews}
                                onChange={(e) => setMinViews(e.target.value)}
                                placeholder="Например: 10000"
                                className="w-full px-3 py-2 text-sm rounded-md border bg-background"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Минимум лайков</label>
                            <input
                                type="number"
                                value={minLikes}
                                onChange={(e) => setMinLikes(e.target.value)}
                                placeholder="Например: 500"
                                className="w-full px-3 py-2 text-sm rounded-md border bg-background"
                            />
                        </div>
                    </div>

                    {/* Active Filters Summary */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            Обновляется автоматически
                        </span>
                        <span>•</span>
                        <span>{filteredItems.length} постов из {items.length}</span>
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
        </Tabs>
    )
}
