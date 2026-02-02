/**
 * ContentPlan Component - Displays the content plan grid.
 * 
 * SOLID Principle: Single Responsibility
 * - This component ONLY renders the content plan UI
 * - Data and callbacks passed via props
 */

"use client"

import { Icons } from "@/components/shared/icons"
import { PostCard, Post } from "./post-card"

interface ContentPlanProps {
    posts: Post[]
    onTogglePost: (id: string) => void
}

export function ContentPlan({ posts, onTogglePost }: ContentPlanProps) {
    // Sort: approved first, then by creation time
    const sortedPosts = [...posts].sort((a, b) => {
        if (a.status === "approved" && b.status !== "approved") return -1
        if (b.status === "approved" && a.status !== "approved") return 1
        return 0
    })

    return (
        <div className="flex-1 flex flex-col border rounded-lg bg-card">
            {/* Header */}
            <div className="p-4 border-b flex items-center justify-between">
                <div>
                    <h2 className="font-semibold">Контент План</h2>
                    <p className="text-xs text-muted-foreground">
                        {posts.length > 0 ? `Всего: ${posts.length}` : "Пусто"}
                    </p>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
                {posts.length === 0 ? (
                    <EmptyState />
                ) : (
                    <div className="grid gap-4">
                        {sortedPosts.map((post) => (
                            <PostCard
                                key={post.id}
                                post={post}
                                onToggle={onTogglePost}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

function EmptyState() {
    return (
        <div className="h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center">
                <Icons.sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Попроси меня создать контент</p>
            </div>
        </div>
    )
}
