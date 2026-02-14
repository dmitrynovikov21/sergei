/**
 * Dataset Analytics Component
 * 
 * Shows aggregated analytics:
 * 1. Topic breakdown table (views, posts, hooks, triggers)
 * 2. Source (competitor) breakdown table
 * 3. AI market analysis button (sends to Claude for insights)
 */

"use client"

import { useState, useMemo, useTransition, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"
import { Icons } from "@/components/shared/icons"
import { Badge } from "@/components/ui/badge"
import { Sparkles, TrendingUp, Users, BarChart3, Eye, Heart, MessageCircle, ChevronDown, ChevronRight, ExternalLink } from "lucide-react"
import { ContentDetailDialog } from "@/components/shared/content-detail-dialog"

// ==========================================
// Types
// ==========================================

interface ContentItem {
    id: string
    headline: string | null
    description: string | null
    originalUrl?: string
    coverUrl?: string | null
    views: number
    likes: number
    comments: number
    viralityScore: number | null
    sourceUsername: string
    contentType: 'Reel' | 'Carousel'
    publishedAt?: Date | null
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

interface TrackingSourceInfo {
    username: string | null
}

interface DatasetAnalyticsProps {
    items: ContentItem[]
    datasetId: string
    trackingSources?: TrackingSourceInfo[]
}

// ==========================================
// Helpers
// ==========================================

function formatNumber(num: number): string {
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
    if (num >= 1_000) return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'K'
    return num.toString()
}

function getTopItems<T>(map: Record<string, number>, limit: number = 3): { key: string, count: number }[] {
    return Object.entries(map)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([key, count]) => ({ key, count }))
}

// Hook type labels
const hookLabels: Record<string, string> = {
    question: '❓ Вопрос',
    statement: '💬 Утверждение',
    shock: '😱 Шок',
    list: '📋 Список',
    story: '📖 История',
    controversy: '🔥 Провокация'
}

// Trigger labels
const triggerLabels: Record<string, string> = {
    fear: '😨 Страх',
    greed: '💰 Жадность',
    curiosity: '🤔 Любопытство',
    anger: '😡 Злость',
    hope: '🌟 Надежда',
    fomo: '⏰ FOMO'
}

// ==========================================
// Component
// ==========================================

export function DatasetAnalytics({ items, datasetId, trackingSources = [] }: DatasetAnalyticsProps) {
    const storageKey = `ai-analysis-${datasetId}`
    const [aiAnalysis, setAiAnalysis] = useState<string | null>(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem(storageKey)
        }
        return null
    })
    const [isPending, startTransition] = useTransition()
    const [isLoading, setIsLoading] = useState(false)
    const [expandedTopic, setExpandedTopic] = useState<string | null>(null)
    const [selectedPost, setSelectedPost] = useState<ContentItem | null>(null)
    const [analysisProgress, setAnalysisProgress] = useState<{
        total: number, analyzed: number, eligible: number, pending: number, isRunning: boolean
    } | null>(null)
    const [isAnalyzing, setIsAnalyzing] = useState(false)

    // Persist AI analysis to localStorage
    useEffect(() => {
        if (aiAnalysis) {
            localStorage.setItem(storageKey, aiAnalysis)
        }
    }, [aiAnalysis, storageKey])

    // Poll analysis progress from DB
    useEffect(() => {
        const fetchProgress = async () => {
            try {
                const res = await fetch(`/api/datasets/analysis-progress?datasetId=${datasetId}`)
                if (res.ok) {
                    const data = await res.json()
                    setAnalysisProgress(data)
                }
            } catch { }
        }
        fetchProgress()
        const interval = setInterval(fetchProgress, 10000) // poll every 10s
        return () => clearInterval(interval)
    }, [datasetId])

    // Only analyzed items
    const analyzedItems = useMemo(() => items.filter(i => i.aiTopic), [items])

    // ==========================================
    // Topic Stats
    // ==========================================
    const topicStats = useMemo(() => {
        const stats: Record<string, {
            count: number
            totalViews: number
            totalLikes: number
            totalComments: number
            avgVirality: number[]
            hookTypes: Record<string, number>
            triggers: Record<string, number>
            topPost: ContentItem | null
        }> = {}

        analyzedItems.forEach(item => {
            const topic = item.aiTopic || 'Другое'
            if (!stats[topic]) {
                stats[topic] = {
                    count: 0, totalViews: 0, totalLikes: 0, totalComments: 0,
                    avgVirality: [], hookTypes: {}, triggers: {}, topPost: null
                }
            }
            const s = stats[topic]
            s.count++
            s.totalViews += item.views
            s.totalLikes += item.likes
            s.totalComments += item.comments
            if (item.viralityScore) s.avgVirality.push(item.viralityScore)
            if (item.aiHookType) s.hookTypes[item.aiHookType] = (s.hookTypes[item.aiHookType] || 0) + 1
            if (item.aiEmotionalTrigger) s.triggers[item.aiEmotionalTrigger] = (s.triggers[item.aiEmotionalTrigger] || 0) + 1
            if (!s.topPost || item.views > s.topPost.views) s.topPost = item
        })

        return Object.entries(stats)
            .map(([topic, s]) => ({
                topic,
                count: s.count,
                totalViews: s.totalViews,
                totalLikes: s.totalLikes,
                totalComments: s.totalComments,
                avgVirality: s.avgVirality.length > 0
                    ? s.avgVirality.reduce((a, b) => a + b, 0) / s.avgVirality.length
                    : 0,
                topHook: getTopItems(s.hookTypes, 1)[0],
                topTrigger: getTopItems(s.triggers, 1)[0],
                topPost: s.topPost
            }))
            .sort((a, b) => b.totalViews - a.totalViews)
    }, [analyzedItems])

    // ==========================================
    // Source (Competitor) Stats
    // ==========================================
    const sourceStats = useMemo(() => {
        const stats: Record<string, {
            count: number
            totalViews: number
            totalLikes: number
            totalComments: number
            posts200k: number
            avgVirality: number[]
            topTopics: Record<string, number>
            topPost: ContentItem | null
            allPosts: ContentItem[]
        }> = {}

        // Pre-populate with ALL tracking sources so they always appear
        trackingSources.forEach(ts => {
            if (ts.username) {
                stats[ts.username] = {
                    count: 0, totalViews: 0, totalLikes: 0, totalComments: 0,
                    posts200k: 0, avgVirality: [], topTopics: {}, topPost: null, allPosts: []
                }
            }
        })

        items.forEach(item => {
            const src = item.sourceUsername || 'unknown'
            if (!stats[src]) {
                stats[src] = {
                    count: 0, totalViews: 0, totalLikes: 0, totalComments: 0,
                    posts200k: 0, avgVirality: [], topTopics: {}, topPost: null, allPosts: []
                }
            }
            const s = stats[src]
            s.count++
            s.totalViews += item.views
            s.totalLikes += item.likes
            s.totalComments += item.comments
            if (item.views >= 200000) s.posts200k++
            if (item.viralityScore) s.avgVirality.push(item.viralityScore)
            if (item.aiTopic) s.topTopics[item.aiTopic] = (s.topTopics[item.aiTopic] || 0) + 1
            if (!s.topPost || item.views > s.topPost.views) s.topPost = item
            s.allPosts.push(item)
        })

        return Object.entries(stats)
            .map(([source, s]) => ({
                source,
                count: s.count,
                totalViews: s.totalViews,
                totalLikes: s.totalLikes,
                totalComments: s.totalComments,
                posts200k: s.posts200k,
                avgViews: s.count > 0 ? Math.round(s.totalViews / s.count) : 0,
                avgVirality: s.avgVirality.length > 0
                    ? s.avgVirality.reduce((a, b) => a + b, 0) / s.avgVirality.length
                    : 0,
                topTopic: getTopItems(s.topTopics, 1)[0],
                topPost: s.topPost,
                allPosts: s.allPosts.sort((a, b) => b.views - a.views)
            }))
            .sort((a, b) => b.totalViews - a.totalViews)
    }, [items, trackingSources])

    // ==========================================
    // Summary Cards
    // ==========================================
    const summary = useMemo(() => {
        const totalViews = items.reduce((a, b) => a + b.views, 0)
        const totalLikes = items.reduce((a, b) => a + b.likes, 0)
        const totalComments = items.reduce((a, b) => a + b.comments, 0)
        const avgVirality = analyzedItems.length > 0
            ? analyzedItems.reduce((a, b) => a + (b.viralityScore || 0), 0) / analyzedItems.length
            : 0
        return { totalViews, totalLikes, totalComments, avgVirality }
    }, [items, analyzedItems])

    // ==========================================
    // AI Analysis Request
    // ==========================================
    const requestAiAnalysis = async () => {
        setIsLoading(true)
        try {
            // Prepare aggregated data for AI
            const payload = {
                datasetId,
                totalItems: items.length,
                analyzedItems: items.length,
                summary: {
                    totalViews: summary.totalViews,
                    totalLikes: summary.totalLikes,
                    avgVirality: summary.avgVirality.toFixed(1)
                },
                topicBreakdown: topicStats.map(t => ({
                    topic: t.topic,
                    posts: t.count,
                    totalViews: t.totalViews,
                    avgVirality: t.avgVirality.toFixed(1),
                    topHook: t.topHook ? (hookLabels[t.topHook.key] || t.topHook.key) : '—',
                    topTrigger: t.topTrigger ? (triggerLabels[t.topTrigger.key] || t.topTrigger.key) : '—',
                    topPost: t.topPost ? { headline: t.topPost.headline || '', views: t.topPost.views } : null
                })),
                sourceBreakdown: sourceStats.map(s => ({
                    source: '@' + s.source,
                    posts: s.count,
                    totalViews: s.totalViews,
                    avgViews: s.avgViews,
                    posts200k: s.posts200k,
                    avgVirality: s.avgVirality.toFixed(1),
                    topTopic: s.topTopic?.key || '—'
                })),
                // Top 30 headlines with full metadata (NO descriptions)
                topHeadlines: items
                    .filter(i => i.headline)
                    .sort((a, b) => b.views - a.views)
                    .slice(0, 30)
                    .map(i => ({
                        headline: i.headline,
                        views: i.views,
                        likes: i.likes,
                        comments: i.comments,
                        virality: i.viralityScore?.toFixed(1) || '0',
                        topic: i.aiTopic || '—',
                        hook: i.aiHookType ? (hookLabels[i.aiHookType] || i.aiHookType) : '—',
                        trigger: i.aiEmotionalTrigger ? (triggerLabels[i.aiEmotionalTrigger] || i.aiEmotionalTrigger) : '—',
                        formula: i.aiContentFormula || '—',
                        audience: i.aiTargetAudience || '—'
                    }))
            }

            const response = await fetch('/api/datasets/analyze-market', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            if (!response.ok) throw new Error('Failed to get AI analysis')

            const data = await response.json()
            setAiAnalysis(data.analysis)
        } catch (error) {
            console.error('AI analysis error:', error)
            setAiAnalysis('❌ Ошибка при получении анализа. Попробуйте позже.')
        } finally {
            setIsLoading(false)
        }
    }

    // ==========================================
    // Render
    // ==========================================
    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-muted/30 border-border/50">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                            <Eye className="h-4 w-4" />
                            <span className="text-xs font-medium">Просмотры</span>
                        </div>
                        <div className="text-2xl font-bold">{formatNumber(summary.totalViews)}</div>
                    </CardContent>
                </Card>
                <Card className="bg-muted/30 border-border/50">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                            <Heart className="h-4 w-4" />
                            <span className="text-xs font-medium">Лайки</span>
                        </div>
                        <div className="text-2xl font-bold">{formatNumber(summary.totalLikes)}</div>
                    </CardContent>
                </Card>
                <Card className="bg-muted/30 border-border/50">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                            <MessageCircle className="h-4 w-4" />
                            <span className="text-xs font-medium">Комменты</span>
                        </div>
                        <div className="text-2xl font-bold">{formatNumber(summary.totalComments)}</div>
                    </CardContent>
                </Card>
                <Card className="bg-muted/30 border-border/50">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                            <TrendingUp className="h-4 w-4" />
                            <span className="text-xs font-medium">Ср. виральность</span>
                        </div>
                        <div className="text-2xl font-bold">{summary.avgVirality.toFixed(1)}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Topic Analytics Table */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        Аналитика по темам
                        <div className="ml-auto flex items-center gap-2">
                            {analysisProgress && (
                                <Badge variant="outline" className="text-xs gap-1">
                                    <span className="text-green-400 font-medium">{analysisProgress.analyzed}</span>
                                    <span className="text-muted-foreground">/</span>
                                    <span className="text-foreground">{analysisProgress.eligible}</span>
                                    <span className="text-muted-foreground">проанализировано</span>
                                    {analysisProgress.pending > 0 && (
                                        <>
                                            <span className="text-yellow-400 font-medium ml-1">({analysisProgress.pending} ожидает)</span>
                                            {(isAnalyzing || analysisProgress.isRunning) ? (
                                                <Badge variant="secondary" className="h-5 px-2 text-[10px] ml-1 gap-1">
                                                    <Icons.spinner className="h-3 w-3 animate-spin" /> Анализирую...
                                                </Badge>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    className="h-5 px-2 text-[10px] ml-1"
                                                    onClick={async (e) => {
                                                        e.stopPropagation()
                                                        setIsAnalyzing(true)
                                                        try {
                                                            const res = await fetch('/api/datasets/run-analysis', {
                                                                method: 'POST',
                                                                headers: { 'Content-Type': 'application/json' },
                                                                body: JSON.stringify({ datasetId })
                                                            })
                                                            const data = await res.json()
                                                            if (data.analyzed > 0) {
                                                                const pRes = await fetch(`/api/datasets/analysis-progress?datasetId=${datasetId}`)
                                                                if (pRes.ok) setAnalysisProgress(await pRes.json())
                                                            }
                                                        } catch { } finally {
                                                            setIsAnalyzing(false)
                                                        }
                                                    }}
                                                >
                                                    ▶ Запустить анализ
                                                </Button>
                                            )}
                                        </>
                                    )}
                                </Badge>
                            )}
                            <Badge variant="outline" className="text-xs">
                                {topicStats.length} тем
                            </Badge>
                        </div>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {topicStats.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                            Нет данных AI анализа. Запустите анализ датасета.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead className="text-xs">Тема</TableHead>
                                        <TableHead className="text-xs text-center">Постов</TableHead>
                                        <TableHead className="text-xs text-right">Просмотры</TableHead>
                                        <TableHead className="text-xs text-right">Лайки</TableHead>
                                        <TableHead className="text-xs text-center">Ср. виральность</TableHead>
                                        <TableHead className="text-xs">Топ хук</TableHead>
                                        <TableHead className="text-xs">Триггер</TableHead>
                                        <TableHead className="text-xs">Лучший пост</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {topicStats.map((t, i) => {
                                        const isExpanded = expandedTopic === t.topic
                                        const topicPosts = isExpanded
                                            ? analyzedItems
                                                .filter(item => (item.aiTopic || 'Другое') === t.topic)
                                                .sort((a, b) => b.views - a.views)
                                                .slice(0, 10)
                                            : []

                                        return (
                                            <>
                                                <TableRow
                                                    key={t.topic}
                                                    className={`cursor-pointer transition-colors hover:bg-muted/50 ${i === 0 ? 'bg-primary/5' : ''} ${isExpanded ? 'bg-muted/30' : ''}`}
                                                    onClick={() => setExpandedTopic(isExpanded ? null : t.topic)}
                                                >
                                                    <TableCell className="font-medium text-sm">
                                                        <span className="mr-1">{isExpanded ? '▼' : '▶'}</span>
                                                        {i === 0 && '🏆 '}{t.topic}
                                                    </TableCell>
                                                    <TableCell className="text-center text-sm">{t.count}</TableCell>
                                                    <TableCell className="text-right text-sm font-mono">
                                                        {formatNumber(t.totalViews)}
                                                    </TableCell>
                                                    <TableCell className="text-right text-sm font-mono">
                                                        {formatNumber(t.totalLikes)}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <span className={
                                                            t.avgVirality > 5 ? 'text-green-400 font-bold' :
                                                                t.avgVirality > 2 ? 'text-yellow-400' : 'text-muted-foreground'
                                                        }>
                                                            {t.avgVirality.toFixed(1)}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-xs">
                                                        {t.topHook ? hookLabels[t.topHook.key] || t.topHook.key : '—'}
                                                    </TableCell>
                                                    <TableCell className="text-xs">
                                                        {t.topTrigger ? triggerLabels[t.topTrigger.key] || t.topTrigger.key : '—'}
                                                    </TableCell>
                                                    <TableCell
                                                        className="text-xs text-muted-foreground max-w-[200px] truncate cursor-pointer hover:text-primary transition-colors"
                                                        onClick={(e) => {
                                                            if (t.topPost) {
                                                                e.stopPropagation()
                                                                setSelectedPost(t.topPost)
                                                            }
                                                        }}
                                                    >
                                                        {(t.topPost?.headline || t.topPost?.description)?.slice(0, 40) || '—'}
                                                        {t.topPost && (
                                                            <span className="ml-1 text-foreground font-mono">
                                                                ({formatNumber(t.topPost.views)})
                                                            </span>
                                                        )}
                                                    </TableCell>
                                                </TableRow>

                                                {/* Expanded topic posts */}
                                                {isExpanded && topicPosts.map((post) => (
                                                    <TableRow
                                                        key={post.id}
                                                        className="bg-muted/10 border-l-2 border-l-primary/30 cursor-pointer hover:bg-muted/20 transition-colors"
                                                        onClick={(e) => { e.stopPropagation(); setSelectedPost(post) }}
                                                    >
                                                        <TableCell colSpan={2} className="text-xs pl-8">
                                                            <span className="text-primary hover:underline">
                                                                {post.headline?.slice(0, 60) || post.description?.slice(0, 60) || 'Без заголовка'}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className="text-right text-xs font-mono">
                                                            {formatNumber(post.views)}
                                                        </TableCell>
                                                        <TableCell className="text-right text-xs font-mono">
                                                            {formatNumber(post.likes)}
                                                        </TableCell>
                                                        <TableCell className="text-center text-xs">
                                                            <span className={
                                                                (post.viralityScore || 0) > 5 ? 'text-green-400' :
                                                                    (post.viralityScore || 0) > 2 ? 'text-yellow-400' : 'text-muted-foreground'
                                                            }>
                                                                {post.viralityScore?.toFixed(1) || '—'}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className="text-xs">
                                                            {post.aiHookType ? hookLabels[post.aiHookType] || post.aiHookType : '—'}
                                                        </TableCell>
                                                        <TableCell className="text-xs">
                                                            {post.aiEmotionalTrigger ? triggerLabels[post.aiEmotionalTrigger] || post.aiEmotionalTrigger : '—'}
                                                        </TableCell>
                                                        <TableCell className="text-xs text-muted-foreground">
                                                            @{post.sourceUsername}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Source (Competitor) Analytics Table */}
            <CompetitorAnalyticsTable sourceStats={sourceStats} formatNumber={formatNumber} setSelectedPost={setSelectedPost} />

            {/* AI Market Analysis */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        AI Анализ рынка
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {!aiAnalysis && !isLoading && (
                        <div className="text-center py-6">
                            <p className="text-sm text-muted-foreground mb-4">
                                Отправить данные всех {items.length} постов в Claude для анализа рынка.
                                <br />
                                AI определит тренды, лучшие форматы и даст рекомендации по контенту.
                            </p>
                            <Button
                                onClick={requestAiAnalysis}
                                disabled={items.length === 0}
                                className="gap-2"
                            >
                                <Sparkles className="h-4 w-4" />
                                Получить AI-заключение
                            </Button>
                        </div>
                    )}

                    {isLoading && (
                        <div className="flex items-center justify-center gap-3 py-8">
                            <Icons.spinner className="h-5 w-5 animate-spin text-primary" />
                            <span className="text-sm text-muted-foreground">Claude анализирует рынок...</span>
                        </div>
                    )}

                    {aiAnalysis && !isLoading && (
                        <div className="space-y-4">
                            <div className="space-y-3">
                                {aiAnalysis.split('\n\n').map((block: string, idx: number) => {
                                    const trimmed = block.trim()
                                    if (!trimmed) return null

                                    // Check if block starts with emoji (section header)
                                    const firstCodePoint = trimmed.codePointAt(0) || 0
                                    const isSection = firstCodePoint > 0x1F000 || (firstCodePoint >= 0x2600 && firstCodePoint <= 0x27BF)

                                    if (isSection) {
                                        const lines = trimmed.split('\n')
                                        const title = lines[0]
                                        const body = lines.slice(1).join('\n').trim()

                                        return (
                                            <div key={idx} className="border-b border-border/30 pb-3 last:border-0">
                                                <div className="text-sm font-semibold text-foreground mb-1.5">
                                                    {title}
                                                </div>
                                                {body && (
                                                    <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap pl-1">
                                                        {body}
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    }

                                    return (
                                        <div key={idx} className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                            {trimmed}
                                        </div>
                                    )
                                })}
                            </div>
                            <div className="flex justify-end pt-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={requestAiAnalysis}
                                    className="gap-2 text-xs"
                                >
                                    <Sparkles className="h-3 w-3" />
                                    Обновить анализ
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
            {/* Post Detail Modal — same as in TrendsTable */}
            <ContentDetailDialog item={selectedPost} onClose={() => setSelectedPost(null)} />
        </div>
    )
}

// ==========================================
// Competitor Analytics Table (with expandable rows)
// ==========================================
interface SourceStat {
    source: string
    count: number
    totalViews: number
    totalLikes: number
    totalComments: number
    posts200k: number
    avgViews: number
    avgVirality: number
    topTopic: { key: string; value: number } | undefined
    topPost: ContentItem | null
    allPosts: ContentItem[]
}

function CompetitorAnalyticsTable({
    sourceStats,
    formatNumber,
    setSelectedPost
}: {
    sourceStats: SourceStat[]
    formatNumber: (n: number) => string
    setSelectedPost: (p: ContentItem | null) => void
}) {
    const [expandedSource, setExpandedSource] = useState<string | null>(null)
    const [visibleCount, setVisibleCount] = useState(50)
    const POSTS_PER_PAGE = 50

    const toggleSource = useCallback((source: string) => {
        if (expandedSource === source) {
            setExpandedSource(null)
        } else {
            setExpandedSource(source)
            setVisibleCount(POSTS_PER_PAGE)
        }
    }, [expandedSource])

    const expandedPosts = useMemo(() => {
        if (!expandedSource) return []
        const stat = sourceStats.find(s => s.source === expandedSource)
        return stat?.allPosts || []
    }, [expandedSource, sourceStats])

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Аналитика по конкурентам
                    <Badge variant="outline" className="ml-auto text-xs">
                        {sourceStats.length} источников
                    </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <Table className="table-fixed">
                        <TableHeader>
                            <TableRow className="bg-muted/50">
                                <TableHead className="text-xs w-8"></TableHead>
                                <TableHead className="text-xs w-10">#</TableHead>
                                <TableHead className="text-xs w-[140px]">Источник</TableHead>
                                <TableHead className="text-xs text-center w-[60px]">Постов</TableHead>
                                <TableHead className="text-xs text-center w-[60px]">200K+</TableHead>
                                <TableHead className="text-xs text-right w-[80px]">Просмотры</TableHead>
                                <TableHead className="text-xs text-right w-[90px]">Ср. просмотры</TableHead>
                                <TableHead className="text-xs text-right w-[70px]">Лайки</TableHead>
                                <TableHead className="text-xs text-center w-[60px]">Ср. вир.</TableHead>
                                <TableHead className="text-xs w-[80px]">Осн. тема</TableHead>
                                <TableHead className="text-xs">Лучший пост</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sourceStats.map((s, i) => (
                                <>
                                    <TableRow
                                        key={s.source}
                                        className={`cursor-pointer transition-colors hover:bg-muted/40 ${i === 0 ? 'bg-primary/5' : ''} ${expandedSource === s.source ? 'bg-muted/30' : ''}`}
                                        onClick={() => toggleSource(s.source)}
                                    >
                                        <TableCell className="text-xs text-muted-foreground w-8 px-2">
                                            {expandedSource === s.source
                                                ? <ChevronDown className="h-3.5 w-3.5" />
                                                : <ChevronRight className="h-3.5 w-3.5" />
                                            }
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground font-mono">
                                            {i + 1}
                                        </TableCell>
                                        <TableCell className="font-medium text-sm">
                                            {i === 0 && '🏆 '}@{s.source}
                                        </TableCell>
                                        <TableCell className="text-center text-sm">{s.count}</TableCell>
                                        <TableCell className="text-center">
                                            {s.posts200k > 0 ? (
                                                <span className="font-mono text-xs font-bold text-foreground">
                                                    {s.posts200k}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right text-sm font-mono">
                                            {formatNumber(s.totalViews)}
                                        </TableCell>
                                        <TableCell className="text-right text-sm font-mono">
                                            {formatNumber(s.avgViews)}
                                        </TableCell>
                                        <TableCell className="text-right text-sm font-mono">
                                            {formatNumber(s.totalLikes)}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <span className={
                                                s.avgVirality > 5 ? 'text-green-400 font-bold' :
                                                    s.avgVirality > 2 ? 'text-yellow-400' : 'text-muted-foreground'
                                            }>
                                                {s.avgVirality.toFixed(1)}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-xs">
                                            {s.topTopic?.key || '—'}
                                        </TableCell>
                                        <TableCell
                                            className="text-xs text-muted-foreground max-w-[200px] truncate cursor-pointer hover:text-primary transition-colors"
                                            onClick={(e) => {
                                                if (s.topPost) {
                                                    e.stopPropagation()
                                                    setSelectedPost(s.topPost)
                                                }
                                            }}
                                        >
                                            {(s.topPost?.headline || s.topPost?.description)?.slice(0, 40) || '—'}
                                            {s.topPost && (
                                                <span className="ml-1 text-foreground font-mono">
                                                    ({formatNumber(s.topPost.views)})
                                                </span>
                                            )}
                                        </TableCell>
                                    </TableRow>

                                    {/* Expanded posts list */}
                                    {expandedSource === s.source && (
                                        <TableRow key={`${s.source}-expanded`}>
                                            <TableCell colSpan={11} className="p-0 bg-background/50">
                                                <div className="border-l-2 border-primary/30 ml-6 py-2">
                                                    <div className="px-4 py-1.5 flex items-center justify-between border-b border-border/30 mb-1">
                                                        <span className="text-xs text-muted-foreground">
                                                            Посты @{s.source} — показано {Math.min(visibleCount, expandedPosts.length)} из {expandedPosts.length} (сортировка по просмотрам)
                                                        </span>
                                                    </div>
                                                    <div className="divide-y divide-border/20">
                                                        {expandedPosts.slice(0, visibleCount).map((post, pi) => (
                                                            <div
                                                                key={post.id}
                                                                className="flex items-center gap-3 px-4 py-2 hover:bg-muted/30 cursor-pointer transition-colors"
                                                                onClick={(e) => { e.stopPropagation(); setSelectedPost(post); }}
                                                            >
                                                                <span className="text-xs text-muted-foreground font-mono w-6 text-right shrink-0">
                                                                    {pi + 1}
                                                                </span>
                                                                {post.coverUrl && (
                                                                    <img
                                                                        src={post.coverUrl}
                                                                        alt=""
                                                                        className="w-10 h-10 rounded object-cover shrink-0"
                                                                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                                                                    />
                                                                )}
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm truncate">
                                                                        {post.headline || post.description?.slice(0, 60) || '—'}
                                                                    </p>
                                                                    <div className="flex items-center gap-3 mt-0.5">
                                                                        <span className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                                                                            <Eye className="h-3 w-3" /> {formatNumber(post.views)}
                                                                        </span>
                                                                        <span className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                                                                            <Heart className="h-3 w-3" /> {formatNumber(post.likes)}
                                                                        </span>
                                                                        {post.aiTopic && (
                                                                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                                                                {post.aiTopic}
                                                                            </Badge>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                {post.views >= 200000 && (
                                                                    <span className="shrink-0 text-[10px] font-mono font-bold text-foreground border border-border px-1.5 py-0.5 rounded">
                                                                        200K+
                                                                    </span>
                                                                )}
                                                                {post.originalUrl && (
                                                                    <a
                                                                        href={post.originalUrl}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="text-muted-foreground hover:text-foreground shrink-0"
                                                                        onClick={(e) => e.stopPropagation()}
                                                                    >
                                                                        <ExternalLink className="h-3.5 w-3.5" />
                                                                    </a>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                    {visibleCount < expandedPosts.length && (
                                                        <div className="px-4 py-2 flex justify-center">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="text-xs gap-1"
                                                                onClick={(e) => { e.stopPropagation(); setVisibleCount(prev => prev + POSTS_PER_PAGE); }}
                                                            >
                                                                Загрузить ещё {Math.min(POSTS_PER_PAGE, expandedPosts.length - visibleCount)} постов
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    )
}
