/**
 * Dataset Content Wrapper
 * 
 * Client component that polls for new content automatically during parsing
 */

"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { ContentItemsTable } from "@/components/datasets/content-items-table"

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

interface DatasetContentWrapperProps {
    datasetId: string
    initialItems: ContentItem[]
}

export function DatasetContentWrapper({ datasetId, initialItems }: DatasetContentWrapperProps) {
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

    // Start polling automatically - always poll every 3 seconds
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
        <div className="space-y-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    Обновляется автоматически
                </span>
                <span>{items.length} постов</span>
            </div>

            <ContentItemsTable items={items} />
        </div>
    )
}
