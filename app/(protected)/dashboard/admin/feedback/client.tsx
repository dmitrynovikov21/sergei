"use client"

import { useState } from "react"
import { FeedbackStats } from "@/actions/feedback"
import { ThumbsUp, ThumbsDown, MessageSquare, Filter } from "lucide-react"

interface Props {
    stats: FeedbackStats
}

export function FeedbackClient({ stats }: Props) {
    const [filter, setFilter] = useState<"all" | "like" | "dislike" | "withText">("all")

    const filtered = stats.recentItems.filter(item => {
        if (filter === "like") return item.feedback === "like"
        if (filter === "dislike") return item.feedback === "dislike"
        if (filter === "withText") return !!item.feedbackText
        return true
    })

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard
                    title="Всего лайков"
                    value={stats.totalLikes}
                    icon={<ThumbsUp className="h-5 w-5 text-emerald-400" />}
                    bg="from-emerald-500/10 to-emerald-500/5"
                    border="border-emerald-500/20"
                />
                <StatCard
                    title="Всего дизлайков"
                    value={stats.totalDislikes}
                    icon={<ThumbsDown className="h-5 w-5 text-rose-400" />}
                    bg="from-rose-500/10 to-rose-500/5"
                    border="border-rose-500/20"
                />
                <StatCard
                    title="С комментарием"
                    value={stats.totalWithText}
                    icon={<MessageSquare className="h-5 w-5 text-blue-400" />}
                    bg="from-blue-500/10 to-blue-500/5"
                    border="border-blue-500/20"
                />
                <StatCard
                    title="Всего оценок"
                    value={stats.totalLikes + stats.totalDislikes}
                    icon={<Filter className="h-5 w-5 text-violet-400" />}
                    bg="from-violet-500/10 to-violet-500/5"
                    border="border-violet-500/20"
                />
            </div>

            {/* By Agent */}
            {stats.byAgent.length > 0 && (
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 overflow-hidden">
                    <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
                        <h3 className="font-semibold text-lg">По агентам</h3>
                    </div>
                    <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {stats.byAgent.map(agent => (
                            <div key={agent.name} className="px-4 py-3 flex items-center justify-between">
                                <span className="font-medium text-sm">{agent.name}</span>
                                <div className="flex items-center gap-4 text-sm">
                                    <span className="flex items-center gap-1.5 text-emerald-500">
                                        <ThumbsUp className="h-3.5 w-3.5" /> {agent.likes}
                                    </span>
                                    <span className="flex items-center gap-1.5 text-rose-500">
                                        <ThumbsDown className="h-3.5 w-3.5" /> {agent.dislikes}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Filter Tabs */}
            <div className="flex gap-2">
                {([
                    { key: "all", label: "Все", count: stats.recentItems.length },
                    { key: "like", label: "Лайки", count: stats.totalLikes },
                    { key: "dislike", label: "Дизлайки", count: stats.totalDislikes },
                    { key: "withText", label: "С отзывом", count: stats.totalWithText },
                ] as const).map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setFilter(tab.key)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === tab.key
                                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                            }`}
                    >
                        {tab.label} ({tab.count})
                    </button>
                ))}
            </div>

            {/* Messages List */}
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 overflow-hidden">
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {filtered.length === 0 && (
                        <div className="p-8 text-center text-zinc-500 text-sm">
                            Нет оценок
                        </div>
                    )}
                    {filtered.map(item => (
                        <div key={item.id} className="p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    {/* Header */}
                                    <div className="flex items-center gap-2 mb-2">
                                        {item.feedback === "like" ? (
                                            <span className="flex items-center gap-1 text-xs font-medium text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                                <ThumbsUp className="h-3 w-3" /> Лайк
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-xs font-medium text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full">
                                                <ThumbsDown className="h-3 w-3" /> Дизлайк
                                            </span>
                                        )}
                                        {item.agentName && (
                                            <span className="text-xs text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                                                {item.agentName}
                                            </span>
                                        )}
                                        <span className="text-xs text-zinc-400">
                                            {item.userName || item.userEmail || "—"}
                                        </span>
                                        <span className="text-xs text-zinc-400 ml-auto">
                                            {new Date(item.createdAt).toLocaleString("ru-RU", {
                                                day: "2-digit",
                                                month: "2-digit",
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })}
                                        </span>
                                    </div>

                                    {/* Message content preview */}
                                    <p className="text-sm text-zinc-700 dark:text-zinc-300 line-clamp-3 whitespace-pre-wrap">
                                        {item.content.replace(/<thinking>[\s\S]*?<\/thinking>\n*/g, '').substring(0, 300)}
                                        {item.content.length > 300 && "..."}
                                    </p>

                                    {/* Feedback text */}
                                    {item.feedbackText && (
                                        <div className="mt-2 p-2 rounded-lg bg-rose-50 dark:bg-rose-500/5 border border-rose-200 dark:border-rose-500/20">
                                            <p className="text-sm text-rose-700 dark:text-rose-300">
                                                <span className="font-medium">Отзыв:</span> {item.feedbackText}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

function StatCard({ title, value, icon, bg, border }: {
    title: string
    value: number
    icon: React.ReactNode
    bg: string
    border: string
}) {
    return (
        <div className={`rounded-xl border ${border} bg-gradient-to-br ${bg} p-4`}>
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-zinc-500 dark:text-zinc-400">{title}</span>
                {icon}
            </div>
            <p className="text-3xl font-bold">{value}</p>
        </div>
    )
}
