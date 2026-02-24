"use client"

import { useState } from "react"
import ReactMarkdown from "react-markdown"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Icons } from "@/components/shared/icons"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import type { Agent } from "@prisma/client"
import type { Attachment, Message } from "./types"
import { useHeadlineBasket } from "./headline-basket-context"

export type { Message }

interface ChatMessageProps {
    msg: Message
    agent: Agent
    agentIcon?: string | null
    isPending: boolean
    onResend: (content: string, attachments: Attachment[]) => void
    onRegenerate: () => void
    onDislike: (id: string) => void
    onCopy: (content: string) => void
    onLike: (id: string) => void
}

export function ChatMessage({
    msg,
    agent,
    agentIcon,
    isPending,
    onResend,
    onRegenerate,
    onDislike,
    onCopy,
    onLike
}: ChatMessageProps) {
    // Lightbox state
    const [lightboxOpen, setLightboxOpen] = useState(false)
    const [lightboxImages, setLightboxImages] = useState<string[]>([])
    const [lightboxIndex, setLightboxIndex] = useState(0)

    const openLightbox = (images: string[], startIndex: number) => {
        setLightboxImages(images)
        setLightboxIndex(startIndex)
        setLightboxOpen(true)
    }

    const getDisplayContent = (content: string) => {
        if (content.startsWith('[ИНСТРУКЦИИ:')) {
            return content.replace(/^\[ИНСТРУКЦИИ:[\s\S]*?\]\n\n/, '')
        }
        return content
    }

    // Extract thinking and main content
    const parseThinking = (content: string) => {
        const thinkingMatch = content.match(/<thinking>([\s\S]*?)<\/thinking>/)
        const thinking = thinkingMatch ? thinkingMatch[1].trim() : null
        const mainContent = content.replace(/<thinking>[\s\S]*?<\/thinking>\n*/, '').trim()
        return { thinking, mainContent }
    }

    return (
        <div
            className={cn(
                "flex gap-3 items-start",
                msg.role === "user" && "justify-end"
            )}
        >
            {/* Removed emoji icon from assistant messages */}

            <div className={cn("flex flex-col gap-1 min-w-0", msg.role === "user" ? "max-w-[75%]" : "flex-1")}>
                {/* Attachments - small thumbnail icons */}
                {msg.attachments && msg.attachments.length > 0 && (() => {
                    const imageAttachments = msg.attachments.filter(a => a.type?.startsWith('image/'))
                    const imageUrls = imageAttachments.map(a => a.url)
                    return (
                        <div className={cn("flex flex-wrap gap-1 mb-1", msg.role === "user" ? "justify-end" : "justify-start")}>
                            {msg.attachments.map((att, i) => (
                                att.type?.startsWith('image/') ? (
                                    <div
                                        key={i}
                                        className="w-10 h-10 rounded-md overflow-hidden border border-border/30 cursor-pointer hover:border-accent/50 transition-colors flex-shrink-0"
                                        onClick={() => openLightbox(imageUrls, imageUrls.indexOf(att.url))}
                                    >
                                        <img
                                            src={att.url}
                                            alt={att.name}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                ) : (
                                    <div key={i} className="flex items-center gap-1.5 px-2 py-1 bg-muted rounded border border-border/30">
                                        <Icons.paperclip className="h-3 w-3 text-muted-foreground/70" />
                                        <span className="text-xs text-muted-foreground/70 max-w-[80px] truncate">{att.name}</span>
                                    </div>
                                )
                            ))}
                        </div>
                    )
                })()}

                <div
                    className={cn(
                        "text-[15px] leading-relaxed",
                        msg.role === "user"
                            ? "bg-muted text-foreground rounded-2xl px-4 py-2.5 whitespace-pre-wrap"
                            : "bg-transparent text-foreground prose dark:prose-invert prose-sm max-w-none [&>*:first-child]:mt-0 prose-p:my-1.5 prose-p:leading-relaxed prose-headings:my-2 prose-headings:mt-3 prose-headings:font-medium prose-headings:text-foreground prose-h1:text-base prose-h2:text-base prose-h3:text-sm prose-ul:my-1.5 prose-li:my-0.5 prose-strong:font-medium prose-strong:text-foreground prose-em:text-foreground prose-code:text-foreground prose-code:bg-transparent prose-code:px-0 prose-code:py-0 prose-code:rounded-none prose-code:font-normal prose-code:before:content-none prose-code:after:content-none prose-pre:bg-transparent prose-pre:p-0 prose-pre:border-0 prose-blockquote:text-foreground prose-blockquote:border-0 prose-blockquote:pl-0 prose-blockquote:not-italic prose-a:text-accent prose-a:no-underline hover:prose-a:underline prose-hr:border-border prose-hr:opacity-30"
                    )}
                >
                    {msg.role === "user" ? (
                        getDisplayContent(msg.content)
                    ) : msg.content ? (() => {
                        // Parse thinking from content
                        const { thinking, mainContent } = parseThinking(msg.content)

                        // Check if this is description agent
                        const isDescAgent = agent && (agent.name.toLowerCase().includes("reels") && (agent.name.toLowerCase().includes("description") || agent.name.toLowerCase().includes("описание")))

                        // Always strip DESC markers from content for ALL agents
                        const stripDescMarkers = (text: string) => {
                            return text
                                .replace(/【DESC】/g, '')
                                .replace(/【\/DESC】/g, '')
                                .replace(/【D(?:E(?:S(?:C)?)?)?(?:】)?$/g, '') // Partial opening markers at end
                                .replace(/【\/D(?:E(?:S(?:C)?)?)?(?:】)?$/g, '') // Partial closing markers at end
                                .replace(/^D(?:E(?:S(?:C)?)?)?】/g, '') // Partial markers at start
                                .replace(/DESC】/g, '') // Just DESC】 without opening bracket
                                .replace(/【DESC/g, '') // Just 【DESC without closing bracket
                                .replace(/\/DESC】/g, '') // Just /DESC】
                        }

                        // Claude-style thinking: single line, border, no background
                        let thinkingBlock: React.ReactNode = null
                        if (thinking) {
                            try {
                                const data = JSON.parse(thinking)
                                const status = data.status || ""
                                // Only show if status looks like actual thinking status, not debugging text
                                if (status && !status.includes("Мне нужно") && !status.includes("готов помочь") && status.length > 3) {
                                    thinkingBlock = (
                                        <div className="border border-border/40 rounded-xl px-4 py-2.5 mb-3">
                                            <span className="text-sm text-foreground/80">
                                                {status.length > 60 ? status.slice(0, 60) + '...' : status}
                                            </span>
                                        </div>
                                    )
                                }
                            } catch {
                                // Don't show non-JSON thinking - it's usually raw AI output
                            }
                        }

                        if (isDescAgent) {
                            // Parse and render with inline counters (only for complete markers)
                            const parts = mainContent.split(/(【DESC】[\s\S]*?【\/DESC】)/g)
                            const hasCompleteMarkers = parts.some(p => /【DESC】[\s\S]*?【\/DESC】/.test(p))

                            if (hasCompleteMarkers) {
                                return (
                                    <>
                                        {thinkingBlock}
                                        {parts.map((part, idx) => {
                                            const descMatch = part.match(/【DESC】([\s\S]*?)【\/DESC】/)
                                            if (descMatch) {
                                                const descText = descMatch[1]
                                                // Count ALL characters including spaces, emojis, punctuation
                                                const charCount = Array.from(descText).length
                                                return (
                                                    <div key={idx} className="mb-4">
                                                        <ReactMarkdown>{descText}</ReactMarkdown>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <div className={cn(
                                                                "text-[11px] font-medium inline-flex items-center gap-1 px-2 py-0.5 rounded-full",
                                                                charCount > 2200
                                                                    ? "text-red-600 bg-red-50 dark:bg-red-900/30"
                                                                    : charCount > 1800
                                                                        ? "text-amber-600 bg-amber-50 dark:bg-amber-900/30"
                                                                        : "text-green-600 bg-green-50 dark:bg-green-900/30"
                                                            )}>
                                                                📝 {charCount} / 2200
                                                            </div>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    navigator.clipboard.writeText(descText)
                                                                    toast.success("Описание скопировано")
                                                                }}
                                                                className="text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                                                                title="Скопировать описание"
                                                            >
                                                                <Icons.copy className="h-3.5 w-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                )
                                            }
                                            // Regular text without markers - strip any markers
                                            const cleanPart = stripDescMarkers(part)
                                            return cleanPart ? <ReactMarkdown key={idx}>{cleanPart}</ReactMarkdown> : null
                                        })}
                                    </>
                                )
                            }

                            // No complete markers yet (still streaming) - show clean content
                            return <>{thinkingBlock}<ReactMarkdown>{stripDescMarkers(mainContent)}</ReactMarkdown></>
                        }

                        // Default rendering for non-description agents
                        // Check for 【H】headline【/H】 tags (Headlines agent)
                        const strippedContent = stripDescMarkers(mainContent)
                        const hasHTags = /【H】[\s\S]*?【\/H】/.test(strippedContent)

                        if (hasHTags) {
                            // Process content to merge numbers with their headlines
                            // Split into lines, merge "N." lines with following H-tagged headline
                            const lines = strippedContent.split('\n')
                            const blocks: { type: 'headline' | 'text'; content: string; num?: string }[] = []
                            let i = 0

                            while (i < lines.length) {
                                const line = lines[i]
                                const hMatch = line.match(/【H】([\s\S]*?)【\/H】/)

                                if (hMatch) {
                                    // This line contains a headline tag
                                    const numPrefix = line.match(/^(\d+\.)\s*【H】/)
                                    blocks.push({
                                        type: 'headline',
                                        content: hMatch[1].trim(),
                                        num: numPrefix ? numPrefix[1] : undefined,
                                    })
                                    i++
                                } else if (/^\d+\.\s*$/.test(line.trim())) {
                                    // This is just a number line (e.g. "1.")
                                    // Check if next non-empty line has H tag
                                    let j = i + 1
                                    while (j < lines.length && lines[j].trim() === '') j++
                                    if (j < lines.length && /【H】/.test(lines[j])) {
                                        const nextMatch = lines[j].match(/【H】([\s\S]*?)【\/H】/)
                                        if (nextMatch) {
                                            blocks.push({
                                                type: 'headline',
                                                content: nextMatch[1].trim(),
                                                num: line.trim(),
                                            })
                                            i = j + 1
                                            continue
                                        }
                                    }
                                    // Not followed by H tag — keep as text
                                    blocks.push({ type: 'text', content: line })
                                    i++
                                } else {
                                    // Regular text line — strip any partial H markers
                                    const cleanLine = line
                                        .replace(/【H】/g, '').replace(/【\/H】/g, '')
                                        .replace(/【H/g, '').replace(/H】/g, '')
                                    if (cleanLine.trim()) {
                                        blocks.push({ type: 'text', content: cleanLine })
                                    }
                                    i++
                                }
                            }

                            return (
                                <>{thinkingBlock}
                                    {blocks.map((block, idx) => {
                                        if (block.type === 'headline') {
                                            const displayText = block.num
                                                ? `${block.num} ${block.content}`
                                                : block.content
                                            return <HeadlineWithBasket key={idx} headline={displayText} rawHeadline={block.content} />
                                        }
                                        return <ReactMarkdown key={idx}>{block.content}</ReactMarkdown>
                                    })}
                                </>
                            )
                        }

                        // No H tags — strip any partial H markers and render normally
                        const cleanContent = stripDescMarkers(mainContent)
                            .replace(/【H】/g, '').replace(/【\/H】/g, '')
                            .replace(/【H/g, '').replace(/H】/g, '')
                        return <>{thinkingBlock}<ReactMarkdown>{cleanContent}</ReactMarkdown></>
                    })() : null}
                </div>


                {/* Action Bar - hide during generation */}
                {!(isPending && msg.role === "assistant") && (
                    <div className={cn(
                        "flex items-center gap-1 transition-opacity duration-300",
                        msg.role === "user" ? "justify-end -mr-2" : "-ml-2"
                    )}>
                        {msg.content && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted animate-in fade-in duration-300"
                                onClick={() => {
                                    // Strip thinking tags and DESC markers before copying
                                    const clean = msg.content
                                        .replace(/<thinking>[\s\S]*?<\/thinking>\n*/g, '')
                                        .replace(/【DESC】/g, '')
                                        .replace(/【\/DESC】/g, '')
                                        .replace(/【H】/g, '')
                                        .replace(/【\/H】/g, '')
                                        .trim()
                                    onCopy(clean)
                                }}
                            >
                                <Icons.copy className="h-3.5 w-3.5" />
                            </Button>
                        )}

                        {msg.role === "user" && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted"
                                onClick={() => onResend(msg.content, msg.attachments || [])}
                                disabled={isPending}
                                title="Отправить повторно"
                            >
                                <Icons.refresh className="h-3.5 w-3.5" />
                            </Button>
                        )}

                        {msg.role === "assistant" && msg.content && (
                            <>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted"
                                    onClick={() => onLike(msg.id)}
                                >
                                    <Icons.thumbsUp className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted"
                                    onClick={() => onDislike(msg.id)}
                                >
                                    <Icons.thumbsDown className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted"
                                    onClick={onRegenerate}
                                    disabled={isPending}
                                >
                                    <Icons.refresh className="h-3.5 w-3.5" />
                                </Button>
                            </>
                        )}
                    </div>
                )}

            </div>

            {/* Lightbox Dialog */}
            <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
                <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 bg-black/95 border-none">
                    <div className="relative flex items-center justify-center min-h-[50vh]">
                        {lightboxImages.length > 1 && (
                            <>
                                <button
                                    onClick={() => setLightboxIndex((prev) => (prev - 1 + lightboxImages.length) % lightboxImages.length)}
                                    className="absolute left-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                                >
                                    <Icons.chevronLeft className="h-6 w-6" />
                                </button>
                                <button
                                    onClick={() => setLightboxIndex((prev) => (prev + 1) % lightboxImages.length)}
                                    className="absolute right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                                >
                                    <Icons.chevronRight className="h-6 w-6" />
                                </button>
                            </>
                        )}
                        <img
                            src={lightboxImages[lightboxIndex]}
                            alt="Preview"
                            className="max-w-full max-h-[85vh] object-contain"
                        />
                        {lightboxImages.length > 1 && (
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-sm">
                                {lightboxIndex + 1} / {lightboxImages.length}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}

// Inline component for rendering a headline with add-to-basket button
function HeadlineWithBasket({ headline, rawHeadline }: { headline: string; rawHeadline?: string }) {
    const [added, setAdded] = useState(false)
    let basket: ReturnType<typeof useHeadlineBasket> | null = null
    try {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        basket = useHeadlineBasket()
    } catch {
        // Context not available
    }

    return (
        <div className="group flex items-center gap-2 py-1">
            <p className="flex-1 text-[15px] leading-relaxed">{headline}</p>
            {basket && (
                <button
                    onClick={(e) => {
                        e.stopPropagation()
                        const textForBasket = (rawHeadline || headline).replace(/^\d+\.\s*/, '').trim()
                        basket!.addHeadline(textForBasket)
                        setAdded(true)
                        toast.success("Добавлено в корзину")
                        setTimeout(() => setAdded(false), 1500)
                    }}
                    className={cn(
                        "shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-all duration-200",
                        added
                            ? "bg-emerald-500 scale-110"
                            : "bg-zinc-700 opacity-0 group-hover:opacity-100 hover:bg-amber-500 hover:scale-110"
                    )}
                    title={added ? "Добавлено!" : "Добавить в корзину"}
                >
                    {added ? (
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                    ) : (
                        <svg className="w-2.5 h-2.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                    )}
                </button>
            )}
        </div>
    )
}

