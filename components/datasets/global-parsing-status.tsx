"use client"

import { useEffect, useState, useRef } from "react"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface ParsingStatus {
    isRunning: boolean
    username?: string
    startedAt?: string
    daysLimit?: number
    minViewsFilter?: number
    postsFound?: number
    isError?: boolean
    error?: string
}

export function GlobalParsingStatus({ datasetId }: { datasetId: string }) {
    const [status, setStatus] = useState<ParsingStatus>({ isRunning: false })
    const [progress, setProgress] = useState(0)
    const intervalRef = useRef<NodeJS.Timeout | null>(null)

    // Poll status
    useEffect(() => {
        const checkStatus = async () => {
            try {
                const res = await fetch(`/api/datasets/${datasetId}/status`, { cache: "no-store" })
                if (res.ok) {
                    const data = await res.json()
                    setStatus(data)
                }
            } catch (e) {
                console.error("Status check failed", e)
            }
        }

        // Check immediately
        checkStatus()

        // Poll every 3 seconds
        const timer = setInterval(checkStatus, 3000)
        return () => clearInterval(timer)
    }, [datasetId])



    if (status.isError) {
        return (
            <div className="flex items-center animate-in fade-in slide-in-from-top-1 duration-300">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger>
                            <Badge variant="destructive" className="pl-1 pr-3 py-1 gap-2 border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive/20">
                                <span className="font-medium whitespace-nowrap">
                                    Ошибка @{status.username || '?'}
                                </span>
                            </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{status.error || "Неизвестная ошибка парсинга"}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
        )
    }

    if (!status.isRunning) return null

    return (
        <div className="flex items-center animate-in fade-in slide-in-from-top-1 duration-300">
            <Badge variant="secondary" className="pl-1 pr-3 py-1 gap-2 border-primary/20 bg-primary/5 text-primary">
                <div className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </div>
                <span className="font-medium whitespace-nowrap text-xs">
                    @{status.username} <span className="text-muted-foreground mx-1">|</span>
                    <span className="text-muted-foreground">Период:</span> {status.daysLimit}д
                    <span className="text-muted-foreground mx-1">•</span>
                    <span className="text-muted-foreground">Мин. просмотры:</span> {status.minViewsFilter && status.minViewsFilter > 0 ? status.minViewsFilter.toLocaleString('ru-RU') : 'Все'}
                    <span className="text-muted-foreground mx-1">•</span>
                    <span className="text-muted-foreground">Найдено:</span> {status.postsFound || 0}
                </span>
            </Badge>
        </div>
    )
}
