"use client"

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { Eye, Heart, TrendingUp, Calendar, ExternalLink, Copy } from "lucide-react"
import { toast } from "sonner"

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
    description?: string | null
    isProcessed: boolean
    isApproved: boolean
    processingError: string | null
    publishedAt: Date | null
    viralityScore: number | null
}

interface PostDetailDialogProps {
    item: ContentItem
    children: React.ReactNode
}

export function PostDetailDialog({ item, children }: PostDetailDialogProps) {
    const copyHeadline = () => {
        if (item.headline) {
            navigator.clipboard.writeText(item.headline)
            toast.success("Заголовок скопирован!")
        }
    }

    const copyDescription = () => {
        if (item.description) {
            navigator.clipboard.writeText(item.description)
            toast.success("Описание скопировано!")
        }
    }

    return (
        <Dialog>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-lg font-semibold">
                        Детали поста
                    </DialogTitle>
                </DialogHeader>

                <div className="grid gap-6 md:grid-cols-[200px_1fr]">
                    {/* Cover Image */}
                    <div className="relative aspect-[9/16] rounded-lg overflow-hidden bg-muted">
                        {item.coverUrl ? (
                            <Image
                                src={`https://images.weserv.nl/?url=${encodeURIComponent(item.coverUrl)}`}
                                alt="Cover"
                                fill
                                className="object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                Нет обложки
                            </div>
                        )}
                    </div>

                    {/* Metrics & Info */}
                    <div className="space-y-4">
                        {/* Metrics Grid */}
                        <div className="grid grid-cols-3 gap-3">
                            <div className="p-3 rounded-lg bg-muted/50 border border-border/50 text-center">
                                <Eye className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                                <div className="text-lg font-bold tabular-nums">
                                    {item.views > 0 ? formatNumber(item.views) : "—"}
                                </div>
                                <div className="text-xs text-muted-foreground">Просмотры</div>
                            </div>
                            <div className="p-3 rounded-lg bg-muted/50 border border-border/50 text-center">
                                <Heart className="h-4 w-4 mx-auto mb-1 text-red-500" />
                                <div className="text-lg font-bold tabular-nums">
                                    {formatNumber(item.likes)}
                                </div>
                                <div className="text-xs text-muted-foreground">Лайки</div>
                            </div>
                            <div className="p-3 rounded-lg bg-muted/50 border border-border/50 text-center">
                                <TrendingUp className="h-4 w-4 mx-auto mb-1 text-orange-500" />
                                <div className="text-lg font-bold tabular-nums">
                                    {item.viralityScore?.toFixed(1) || "—"}x
                                </div>
                                <div className="text-xs text-muted-foreground">Виральность</div>
                            </div>
                        </div>

                        {/* Date & Virality Badge */}
                        <div className="flex items-center gap-3 flex-wrap">
                            {item.publishedAt && (
                                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                    <Calendar className="h-3.5 w-3.5" />
                                    {new Date(item.publishedAt).toLocaleDateString('ru-RU', {
                                        day: 'numeric',
                                        month: 'long',
                                        year: 'numeric'
                                    })}
                                </div>
                            )}
                            {item.viralityScore != null && (
                                <Badge
                                    variant={item.viralityScore >= 1.5 ? "destructive" : item.viralityScore >= 1 ? "default" : "secondary"}
                                >
                                    {item.viralityScore >= 1.5 ? '🔥 Вирусный' : item.viralityScore >= 1 ? '📈 Растущий' : 'Обычный'}
                                </Badge>
                            )}
                        </div>

                        {/* Headline */}
                        {item.headline && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">Заголовок</span>
                                    <Button variant="ghost" size="sm" className="h-7" onClick={copyHeadline}>
                                        <Copy className="h-3 w-3 mr-1" />
                                        Копировать
                                    </Button>
                                </div>
                                <p className="text-sm bg-muted/50 p-3 rounded-lg border border-border/50">
                                    {item.headline}
                                </p>
                            </div>
                        )}

                        {/* Description */}
                        {item.description && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">Описание</span>
                                    <Button variant="ghost" size="sm" className="h-7" onClick={copyDescription}>
                                        <Copy className="h-3 w-3 mr-1" />
                                        Копировать
                                    </Button>
                                </div>
                                <p className="text-sm bg-muted/50 p-3 rounded-lg border border-border/50 max-h-32 overflow-y-auto">
                                    {item.description}
                                </p>
                            </div>
                        )}

                        {/* Link to Instagram */}
                        <Button variant="outline" className="w-full" asChild>
                            <a href={item.originalUrl} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Открыть в Instagram
                            </a>
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

function formatNumber(num: number): string {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
}
