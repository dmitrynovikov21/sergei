/**
 * Content Detail Dialog
 * 
 * Shared dialog component for displaying detailed post information.
 * Used in both TrendsTable and DatasetAnalytics components.
 */

"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { ExternalLink, Copy, Image } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

// ==========================================
// Types
// ==========================================

export interface ContentDetailItem {
    id: string
    headline: string | null
    description: string | null
    originalUrl?: string
    coverUrl?: string | null
    videoUrl?: string | null
    views: number
    likes: number
    comments: number
    viralityScore: number | null
    sourceUsername: string
    contentType: string
    publishedAt?: Date | null
    datasetName?: string
    // AI fields
    aiTopic?: string | null
    aiSubtopic?: string | null
    aiHookType?: string | null
    aiContentFormula?: string | null
    aiSuccessReason?: string | null
    aiTags?: string | null
    aiEmotionalTrigger?: string | null
    aiTargetAudience?: string | null
    aiAnalyzedAt?: Date | null
}

interface ContentDetailDialogProps {
    item: ContentDetailItem | null
    onClose: () => void
}

// ==========================================
// Helpers
// ==========================================

export function getProxyImageUrl(url: string | null): string {
    if (!url) return ''
    try {
        return `/api/image-proxy?url=${encodeURIComponent(url)}`
    } catch {
        return url
    }
}

function formatNumber(num: number): string {
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
    if (num >= 1_000) return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'K'
    return num.toString()
}

function formatDate(date: Date | null | undefined): string {
    if (!date) return '—'
    return new Date(date).toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    })
}

// ==========================================
// Component
// ==========================================

export function ContentDetailDialog({ item, onClose }: ContentDetailDialogProps) {
    const [lightboxOpen, setLightboxOpen] = useState(false)
    const [mounted, setMounted] = useState(false)
    const copyText = (text: string) => {
        navigator.clipboard.writeText(text)
        toast.success('Скопировано')
    }

    useEffect(() => { setMounted(true) }, [])
    useEffect(() => { if (!item) setLightboxOpen(false) }, [item])

    return (
        <>
            <Dialog open={!!item} onOpenChange={(open) => !open && onClose()}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
                    <DialogHeader className="shrink-0">
                        <DialogTitle className="text-lg flex items-center gap-2">
                            {item?.contentType} от @{item?.sourceUsername}
                            {item?.originalUrl && (
                                <a
                                    href={item.originalUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-muted-foreground hover:text-foreground transition-colors"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <ExternalLink className="h-4 w-4" />
                                </a>
                            )}
                        </DialogTitle>
                    </DialogHeader>
                    {item && (
                        <div className="space-y-4 overflow-y-auto pr-2">
                            {/* Top row: Image + Stats */}
                            <div className="flex gap-4">
                                {/* Cover image or placeholder */}
                                <div className="w-48 h-48 shrink-0 rounded-lg overflow-hidden bg-muted/30 flex items-center justify-center">
                                    {item.coverUrl ? (
                                        <img
                                            src={getProxyImageUrl(item.coverUrl)}
                                            alt="Cover"
                                            className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                                            onClick={() => setLightboxOpen(true)}
                                            onError={(e) => {
                                                const parent = e.currentTarget.parentElement
                                                if (parent) {
                                                    parent.innerHTML = '<div class="h-12 w-12 text-muted-foreground/30"><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg></div>'
                                                }
                                            }}
                                        />
                                    ) : (
                                        <Image className="h-12 w-12 text-muted-foreground/30" />
                                    )}
                                </div>

                                {/* Stats 2x2 grid */}
                                <div className="flex-1 grid grid-cols-2 gap-3">
                                    <div className="flex flex-col items-center justify-center p-3 bg-muted/30 rounded-lg">
                                        <div className="text-2xl font-bold">{formatNumber(item.views)}</div>
                                        <div className="text-xs text-muted-foreground">Просмотры</div>
                                    </div>
                                    <div className="flex flex-col items-center justify-center p-3 bg-muted/30 rounded-lg">
                                        <div className="text-2xl font-bold">{formatNumber(item.likes)}</div>
                                        <div className="text-xs text-muted-foreground">Лайки</div>
                                    </div>
                                    <div className="flex flex-col items-center justify-center p-3 bg-muted/30 rounded-lg">
                                        <div className="text-2xl font-bold">{formatNumber(item.comments)}</div>
                                        <div className="text-xs text-muted-foreground">Комменты</div>
                                    </div>
                                    <div className="flex flex-col items-center justify-center p-3 bg-muted/30 rounded-lg">
                                        <div className={cn(
                                            "text-2xl font-bold",
                                            (item.viralityScore || 0) > 5 ? 'text-green-400' :
                                                (item.viralityScore || 0) > 2 ? 'text-yellow-400' : ''
                                        )}>
                                            {item.viralityScore?.toFixed(1) || '—'}
                                        </div>
                                        <div className="text-xs text-muted-foreground">Виральность</div>
                                    </div>
                                </div>
                            </div>

                            {/* Headline with copy */}
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <h4 className="text-sm font-medium text-muted-foreground">Заголовок</h4>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 text-xs shrink-0"
                                        onClick={() => copyText(item.headline || '')}
                                    >
                                        <Copy className="h-3 w-3 mr-1" /> Копировать
                                    </Button>
                                </div>
                                <p className="text-foreground font-medium">
                                    {item.headline || '—'}
                                </p>
                            </div>

                            {/* Description with copy */}
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <h4 className="text-sm font-medium text-muted-foreground">Описание</h4>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 text-xs shrink-0"
                                        onClick={() => copyText(item.description || '')}
                                    >
                                        <Copy className="h-3 w-3 mr-1" /> Копировать
                                    </Button>
                                </div>
                                <p className="text-foreground text-sm whitespace-pre-wrap max-h-60 overflow-y-auto scrollbar-thin">
                                    {item.description || '—'}
                                </p>
                            </div>

                            {/* AI Analysis Section */}
                            {item.aiTopic && (
                                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
                                    <h4 className="text-sm font-semibold text-primary flex items-center gap-2">
                                        🧠 AI Анализ
                                    </h4>

                                    {/* Topic & Hook Row */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <span className="text-xs text-muted-foreground">Тема</span>
                                            <p className="text-sm font-medium">{item.aiTopic}</p>
                                            {item.aiSubtopic && (
                                                <p className="text-xs text-muted-foreground">{item.aiSubtopic}</p>
                                            )}
                                        </div>
                                        <div>
                                            <span className="text-xs text-muted-foreground">Hook Type</span>
                                            <p className="text-sm font-medium capitalize">{item.aiHookType || '—'}</p>
                                        </div>
                                    </div>

                                    {/* Formula */}
                                    {item.aiContentFormula && (
                                        <div>
                                            <span className="text-xs text-muted-foreground">Формула контента</span>
                                            <p className="text-sm">{item.aiContentFormula}</p>
                                        </div>
                                    )}

                                    {/* Success Reason */}
                                    {item.aiSuccessReason && (
                                        <div>
                                            <span className="text-xs text-muted-foreground">Почему залетело</span>
                                            <p className="text-sm text-green-400">{item.aiSuccessReason}</p>
                                        </div>
                                    )}

                                    {/* Tags & Trigger Row */}
                                    <div className="grid grid-cols-2 gap-3">
                                        {item.aiTags && (
                                            <div>
                                                <span className="text-xs text-muted-foreground">Теги</span>
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {(() => {
                                                        try {
                                                            const tags = JSON.parse(item.aiTags)
                                                            return tags.map((tag: string, i: number) => (
                                                                <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-muted">
                                                                    {tag}
                                                                </span>
                                                            ))
                                                        } catch {
                                                            return item.aiTags.split(',').map((tag: string, i: number) => (
                                                                <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-muted">
                                                                    {tag.trim()}
                                                                </span>
                                                            ))
                                                        }
                                                    })()}
                                                </div>
                                            </div>
                                        )}
                                        {item.aiEmotionalTrigger && (
                                            <div>
                                                <span className="text-xs text-muted-foreground">Эмоц. триггер</span>
                                                <p className="text-sm capitalize">{item.aiEmotionalTrigger}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Target Audience */}
                                    {item.aiTargetAudience && (
                                        <div>
                                            <span className="text-xs text-muted-foreground">Целевая аудитория</span>
                                            <p className="text-sm">{item.aiTargetAudience}</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Meta */}
                            <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2 border-t border-border/50">
                                <span>📅 {formatDate(item.publishedAt)}</span>
                                {item.datasetName && <span>📁 {item.datasetName}</span>}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Fullscreen image lightbox — portal to body, isolated from Dialog */}
            {mounted && lightboxOpen && item?.coverUrl && createPortal(
                <div
                    className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center cursor-pointer"
                    onClick={() => setLightboxOpen(false)}
                >
                    <img
                        src={getProxyImageUrl(item.coverUrl)}
                        alt="Full size"
                        className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
                        onClick={(e) => e.stopPropagation()}
                    />
                    <button
                        className="absolute top-4 right-4 text-white/70 hover:text-white text-2xl font-bold"
                        onClick={() => setLightboxOpen(false)}
                    >
                        ✕
                    </button>
                </div>,
                document.body
            )}
        </>
    )
}
