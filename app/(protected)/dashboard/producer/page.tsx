"use client"

import { useState, useRef, useEffect } from "react"
import { useChat } from "@ai-sdk/react"
import { Icons } from "@/components/shared/icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"

interface GeneratedPost {
    id: string
    headline: string
    caption: string
    reasoning: string
    status: "pending" | "approved" | "rejected"
    hookType?: string
    isNew?: boolean
    createdAt: number
}

let postIdCounter = 0

export default function ProducerPage() {
    const [posts, setPosts] = useState<GeneratedPost[]>([])
    const [generatingScripts, setGeneratingScripts] = useState(false)
    const [scriptsProgress, setScriptsProgress] = useState({ current: 0, total: 0 })
    const messagesEndRef = useRef<HTMLDivElement>(null)

    // AI Chat with function calling
    const { messages, input, handleInputChange, handleSubmit, isLoading, setMessages } = useChat({
        api: "/api/producer",
        body: {
            posts: posts, // Send current state to AI
        },
        onToolCall: async ({ toolCall }) => {
            console.log("[Tool Call]", toolCall)

            // Handle tool results
            const result = toolCall.args as any

            switch (result.action) {
                case "generate_headlines":
                    await handleGenerateHeadlines(result.count, result.trendsContext)
                    break
                case "add_more_headlines":
                    await handleAddMoreHeadlines(result.count)
                    break
                case "generate_scripts":
                    await handleGenerateScripts()
                    break
                case "show_analysis":
                    toast.info(`📊 Аналитика за ${result.days} дней:\n${result.totalItems} постов, avg ${result.avgViews} views`)
                    break
                case "clear_all":
                    setPosts([])
                    postIdCounter = 0
                    toast.success("Очищено!")
                    break
            }
        },
        initialMessages: [
            {
                id: "welcome",
                role: "assistant",
                content: "👋 Привет! Я Master Agent — твой AI продюсер контента.\n\nПросто напиши что хочешь сделать, например:\n• \"Сделай мне 10 заголовков для рилс\"\n• \"Хочу проанализировать тренды\"\n• \"Напиши скрипты к выбранным\"\n\nЯ сам пойму и сделаю!"
            }
        ]
    })

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    // Handler functions that AI can trigger
    const handleGenerateHeadlines = async (count: number, trendsContext: string[]) => {
        // Reset and generate fresh
        postIdCounter = 0

        const mockPosts: GeneratedPost[] = Array.from({ length: count }, (_, i) => {
            postIdCounter++
            return {
                id: `post_${postIdCounter}`,
                headline: generateSmartHeadline(i, trendsContext),
                caption: "",
                reasoning: "",
                status: "pending" as const,
                hookType: ["curiosity", "controversy", "fear", "authority"][i % 4],
                isNew: true,
                createdAt: Date.now() + i
            }
        })

        setPosts(mockPosts)
        toast.success(`✅ Сгенерировано ${count} заголовков!`)
    }

    const handleAddMoreHeadlines = async (count: number) => {
        // Mark existing as not new
        setPosts(prev => prev.map(p => ({ ...p, isNew: false })))

        const newPosts: GeneratedPost[] = Array.from({ length: count }, (_, i) => {
            postIdCounter++
            return {
                id: `post_${postIdCounter}`,
                headline: generateSmartHeadline(postIdCounter, []),
                caption: "",
                reasoning: "",
                status: "pending" as const,
                hookType: ["curiosity", "controversy", "fear", "authority"][postIdCounter % 4],
                isNew: true,
                createdAt: Date.now() + i
            }
        })

        setPosts(prev => [...prev, ...newPosts])
        toast.success(`✅ Добавлено ${count} заголовков!`)
    }

    const handleGenerateScripts = async () => {
        const approvedPosts = posts.filter(p => p.status === "approved" && !p.caption)

        if (approvedPosts.length === 0) {
            toast.warning("Сначала выбери заголовки галочками!")
            return
        }

        setGeneratingScripts(true)
        setScriptsProgress({ current: 0, total: approvedPosts.length })

        for (let i = 0; i < approvedPosts.length; i++) {
            const post = approvedPosts[i]
            setScriptsProgress({ current: i + 1, total: approvedPosts.length })

            await new Promise(resolve => setTimeout(resolve, 600))

            setPosts(prev => prev.map(p => {
                if (p.id === post.id) {
                    return {
                        ...p,
                        caption: generateSmartCaption(p.headline),
                        reasoning: generateSmartReasoning(p.hookType || "curiosity")
                    }
                }
                return p
            }))
        }

        setGeneratingScripts(false)
        toast.success(`✅ Скрипты готовы!`)
    }

    const togglePostStatus = (postId: string) => {
        setPosts(prev => prev.map(post => {
            if (post.id === postId) {
                return {
                    ...post,
                    status: post.status === "approved" ? "pending" : "approved"
                }
            }
            return post
        }))
    }

    // Sort: approved first, then new, then old
    const sortedPosts = [...posts].sort((a, b) => {
        if (a.status === "approved" && b.status !== "approved") return -1
        if (b.status === "approved" && a.status !== "approved") return 1
        if (a.isNew && !b.isNew) return -1
        if (b.isNew && !a.isNew) return 1
        return b.createdAt - a.createdAt
    })

    const approvedCount = posts.filter(p => p.status === "approved").length

    return (
        <div className="flex h-[calc(100vh-4rem)] gap-4 p-4">
            {/* Chat Panel - Left */}
            <div className="w-1/3 flex flex-col border rounded-lg bg-card">
                <div className="p-4 border-b">
                    <h2 className="font-semibold flex items-center gap-2">
                        <Icons.bot className="h-5 w-5" />
                        Master Agent
                    </h2>
                    <p className="text-xs text-muted-foreground">AI Executive Producer</p>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                            <div
                                className={`max-w-[85%] rounded-lg px-4 py-2 ${msg.role === "user"
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-secondary"
                                    }`}
                            >
                                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                            </div>
                        </div>
                    ))}
                    {(isLoading || generatingScripts) && (
                        <div className="flex justify-start">
                            <div className="bg-secondary rounded-lg px-4 py-2 flex items-center gap-2">
                                <Icons.spinner className="h-4 w-4 animate-spin" />
                                {generatingScripts && (
                                    <span className="text-xs">
                                        {scriptsProgress.current}/{scriptsProgress.total}
                                    </span>
                                )}
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <form onSubmit={handleSubmit} className="p-4 border-t">
                    <div className="flex gap-2">
                        <Input
                            value={input}
                            onChange={handleInputChange}
                            placeholder="Напиши что хочешь сделать..."
                            disabled={isLoading || generatingScripts}
                        />
                        <Button type="submit" disabled={isLoading || generatingScripts}>
                            <Icons.send className="h-4 w-4" />
                        </Button>
                    </div>
                </form>
            </div>

            {/* Posts Grid - Right */}
            <div className="flex-1 flex flex-col border rounded-lg bg-card">
                <div className="p-4 border-b flex items-center justify-between">
                    <div>
                        <h2 className="font-semibold">Посты</h2>
                        <p className="text-xs text-muted-foreground">
                            {posts.length === 0 && "Попроси AI создать заголовки"}
                            {posts.length > 0 && `Выбрано: ${approvedCount} из ${posts.length}`}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {posts.length > 0 && (
                            <Badge variant="secondary">
                                {posts.filter(p => p.caption).length > 0
                                    ? `📝 ${posts.filter(p => p.caption).length} скриптов`
                                    : "📋 Заголовки"
                                }
                            </Badge>
                        )}
                    </div>
                </div>

                {/* Posts */}
                <div className="flex-1 overflow-y-auto p-4">
                    {posts.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-muted-foreground">
                            <div className="text-center">
                                <Icons.fileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p>Напиши в чат что хочешь</p>
                                <p className="text-xs mt-2">Например: "сделай 10 заголовков"</p>
                            </div>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {sortedPosts.map((post) => (
                                <Card
                                    key={post.id}
                                    className={`transition-all cursor-pointer ${post.status === "approved"
                                        ? "ring-2 ring-primary"
                                        : post.isNew
                                            ? "ring-1 ring-green-500/50 bg-green-500/5"
                                            : "hover:bg-muted/50"
                                        }`}
                                    onClick={() => togglePostStatus(post.id)}
                                >
                                    <CardHeader className="pb-2">
                                        <div className="flex items-start gap-3">
                                            <Checkbox
                                                checked={post.status === "approved"}
                                                onCheckedChange={() => togglePostStatus(post.id)}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <CardTitle className="text-base leading-tight">
                                                        {post.headline}
                                                    </CardTitle>
                                                    {post.isNew && (
                                                        <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-600 border-green-500/30">
                                                            NEW
                                                        </Badge>
                                                    )}
                                                </div>
                                                {post.hookType && (
                                                    <Badge variant="outline" className="mt-2 text-xs">
                                                        {post.hookType === "curiosity" && "🤔 Curiosity"}
                                                        {post.hookType === "controversy" && "⚡ Controversy"}
                                                        {post.hookType === "fear" && "😰 Fear"}
                                                        {post.hookType === "authority" && "👔 Authority"}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </CardHeader>
                                    {post.caption && (
                                        <CardContent className="pt-0" onClick={(e) => e.stopPropagation()}>
                                            <div className="mt-2 p-3 bg-muted rounded-lg">
                                                <p className="text-sm whitespace-pre-wrap">{post.caption}</p>
                                            </div>
                                            {post.reasoning && (
                                                <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                                                    <p className="text-xs font-medium text-amber-600 mb-1">
                                                        💡 Почему это работает:
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {post.reasoning}
                                                    </p>
                                                </div>
                                            )}
                                        </CardContent>
                                    )}
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

// Smart generators (will be replaced with real AI)
function generateSmartHeadline(index: number, context: string[]): string {
    const headlines = [
        "Перестань разговаривать сам с собой?",
        "Почему богатые никогда не говорят о деньгах",
        "3 слова которые разрушают отношения",
        "Нейробиология утверждает: ты делаешь это неправильно",
        "Секрет который скрывают успешные люди",
        "Почему 95% людей никогда не разбогатеют",
        "То что тебе не рассказывали в школе",
        "Один навык который изменит всё",
        "Психологи обнаружили шокирующую правду",
        "Это убивает твою продуктивность",
        "Что знают миллионеры чего не знаешь ты",
        "5 привычек которые меняют жизнь",
        "Почему ты всегда устаёшь",
        "Секретная техника фокусировки",
        "Как перестать откладывать дела",
    ]
    return headlines[index % headlines.length]
}

function generateSmartCaption(headline: string): string {
    return `Знаешь что самое интересное?\n\n${headline.toLowerCase().replace("?", "")} — это именно то, что отличает успешных людей от всех остальных.\n\nНаука доказывает: когда ты понимаешь эту концепцию, твоя жизнь меняется навсегда.\n\nСохрани и поделись с другом 👇`
}

function generateSmartReasoning(hookType: string): string {
    const reasonings: Record<string, string> = {
        curiosity: "Паттерн 'curiosity gap' — создаём незакрытый вопрос. Мозг физически не может оставить его без ответа.",
        controversy: "Провокация создаёт когнитивный диссонанс. Зритель смотрит чтобы найти аргументы против.",
        fear: "Триггер FOMO — страх упустить важную информацию. Один из самых сильных мотиваторов.",
        authority: "Ссылка на науку активирует паттерн доверия. Люди склонны верить экспертам."
    }
    return reasonings[hookType] || reasonings.curiosity
}
