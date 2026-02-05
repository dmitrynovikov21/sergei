/**
 * Dataset Tabs Component
 * 
 * Client component that handles auto-refresh and counter updates
 * Uses TrendsTable for unified UX with Trends page
 */

"use client"

import { useEffect, useState, useCallback, useRef, useTransition } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Icons } from "@/components/shared/icons"
import { TrendsTable } from "@/components/trends/trends-table"
import { SourcesList } from "@/components/datasets/sources-list"
import { AddSourceDialog } from "@/components/datasets/add-source-dialog"

import { reprocessDatasetHeadlines } from "@/actions/datasets"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

// TrendsTable-compatible interface
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
    const intervalRef = useRef<NodeJS.Timeout | null>(null)
    const [isPending, startTransition] = useTransition()

    // Count items needing reprocessing
    const needsReprocessCount = items.filter(item => !item.headline).length

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

                <div className="flex items-center gap-3">
                    {/* Auto-update badge with border */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground px-3 py-1.5 border border-border/50 rounded-lg">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                        Обновляется автоматически
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
                </div>
            </div>

            <TabsContent value="content" className="space-y-4">
                {/* TrendsTable has its own filters */}
                <TrendsTable items={items} />
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
