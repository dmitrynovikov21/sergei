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
    const intervalRef = useRef<NodeJS.Timeout | null>(null)

    // Fetch latest items
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

            <TabsContent value="content" className="space-y-4">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        Обновляется автоматически
                    </span>
                    <span>{items.length} постов</span>
                </div>

                <ContentItemsTable items={items} />
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
