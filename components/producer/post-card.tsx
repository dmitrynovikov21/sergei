/**
 * PostCard Component - Displays a single content item.
 * 
 * SOLID Principle: Single Responsibility
 * - This component ONLY renders a post card
 * - Selection logic is passed via props
 */

"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"

export interface Post {
    id: string
    headline: string
    caption?: string
    reasoning?: string
    status: "pending" | "approved" | "rejected"
    hookType?: string
}

interface PostCardProps {
    post: Post
    onToggle: (id: string) => void
}

export function PostCard({ post, onToggle }: PostCardProps) {
    const isApproved = post.status === "approved"

    return (
        <Card
            className={`transition-all cursor-pointer ${isApproved ? "ring-2 ring-primary" : "hover:bg-muted/50"
                }`}
            onClick={() => onToggle(post.id)}
        >
            <CardHeader className="pb-2">
                <div className="flex items-start gap-3">
                    <Checkbox
                        checked={isApproved}
                        onCheckedChange={() => onToggle(post.id)}
                        onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex-1">
                        <CardTitle className="text-base">{post.headline}</CardTitle>
                        {post.hookType && (
                            <Badge variant="outline" className="mt-2 text-xs">
                                {post.hookType}
                            </Badge>
                        )}
                    </div>
                </div>
            </CardHeader>

            {post.caption && (
                <CardContent className="pt-0" onClick={(e) => e.stopPropagation()}>
                    <div className="mt-2 p-3 bg-muted rounded-lg space-y-2">
                        <p className="text-sm font-semibold">Script / Caption:</p>
                        <p className="text-sm whitespace-pre-wrap">{post.caption}</p>
                    </div>

                    {post.reasoning && (
                        <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                            <p className="text-xs font-medium text-blue-600 mb-1">
                                🧠 AI Reasoning:
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {post.reasoning}
                            </p>
                        </div>
                    )}
                </CardContent>
            )}
        </Card>
    )
}
