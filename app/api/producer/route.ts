/**
 * Producer Chat API - AI with Function Calling
 * 
 * AI понимает намерение пользователя и сам вызывает нужные функции
 */

import { z } from "zod"
import { tool } from "ai"
import { prisma } from "@/lib/db"
import { AiGateway } from "@/lib/services/ai-gateway"
import { auth } from "@/auth"

export const maxDuration = 60

// Available tools for the AI
const producerTools = {
    generateHeadlines: tool({
        description: "Генерирует новые заголовки для постов на основе виральных трендов. Вызывай когда пользователь просит создать/сделать/сгенерировать заголовки или посты.",
        parameters: z.object({
            count: z.number().min(1).max(50),
            topic: z.string().optional(),
        }),
        execute: async ({ count, topic }) => {
            const trends = await prisma.contentItem.findMany({
                where: {
                    views: { gte: 50000 },
                    headline: { not: null },
                    publishedAt: {
                        gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
                    }
                },
                orderBy: { views: "desc" },
                take: 20,
                select: {
                    headline: true,
                    views: true,
                }
            })

            return {
                action: "generate_headlines",
                count,
                topic: topic || "общая тематика",
                trendsContext: trends.slice(0, 5).map(t => t.headline),
            }
        }
    }),

    addMoreHeadlines: tool({
        description: "Добавляет ещё заголовков к существующему списку. Вызывай когда пользователь просит 'ещё', 'добавь', 'больше'.",
        parameters: z.object({
            count: z.number().min(1).max(20).default(5),
        }),
        execute: async ({ count }) => {
            return {
                action: "add_more_headlines",
                count,
            }
        }
    }),

    generateScripts: tool({
        description: "Генерирует скрипты/тексты для выбранных заголовков. Вызывай когда пользователь просит написать скрипты, тексты, посты к выбранным заголовкам или говорит 'далее'.",
        parameters: z.object({
            includeReasoning: z.boolean().default(true),
        }),
        execute: async ({ includeReasoning }) => {
            return {
                action: "generate_scripts",
                includeReasoning,
            }
        }
    }),

    analyzeContent: tool({
        description: "Анализирует виральный контент и показывает паттерны. Вызывай когда пользователь просит проанализировать, показать тренды, статистику.",
        parameters: z.object({
            days: z.number().min(1).max(30).default(7),
        }),
        execute: async ({ days }) => {
            const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

            const stats = await prisma.contentItem.aggregate({
                where: {
                    publishedAt: { gte: cutoff },
                    views: { gte: 10000 }
                },
                _count: true,
                _avg: { views: true },
                _max: { views: true },
            })

            return {
                action: "show_analysis",
                days,
                totalItems: stats._count,
                avgViews: Math.round(stats._avg.views || 0),
                maxViews: stats._max.views || 0,
            }
        }
    }),

    clearAll: tool({
        description: "Очищает все заголовки и начинает сначала. Вызывай когда пользователь хочет очистить, сбросить, начать заново.",
        parameters: z.object({}),
        execute: async () => {
            return {
                action: "clear_all",
            }
        }
    }),
}

export async function POST(req: Request) {
    try {
        const session = await auth()
        const userId = session?.user?.id || "anonymous"

        const { messages, posts } = await req.json()

        const systemPrompt = `Ты Master Agent — AI продюсер контента. Твоя задача помогать создавать виральный контент.

ТЕКУЩЕЕ СОСТОЯНИЕ:
- Заголовков всего: ${posts?.length || 0}
- Выбрано (approved): ${posts?.filter((p: any) => p.status === "approved").length || 0}
- Со скриптами: ${posts?.filter((p: any) => p.caption).length || 0}

ТВОИ ВОЗМОЖНОСТИ (функции):
1. generateHeadlines - генерация новых заголовков
2. addMoreHeadlines - добавить ещё заголовков  
3. generateScripts - написать скрипты для выбранных
4. analyzeContent - показать аналитику трендов
5. clearAll - очистить и начать заново

ПРАВИЛА:
- Понимай намерение пользователя и вызывай нужную функцию
- Если непонятно - уточни что именно хочет пользователь
- Отвечай кратко и по делу
- Используй эмодзи для наглядности`

        // Use AiGateway for centralized logging
        const result = await AiGateway.streamCompletion({
            model: "gpt-4o",
            messages,
            userId,
            system: systemPrompt,
            tools: producerTools,
            maxSteps: 3,
            context: { endpoint: "producer", postsCount: posts?.length || 0 }
        })

        return result.toTextStreamResponse()
    } catch (error) {
        console.error("[Producer API Error] Stack:", error);
        console.error("[Producer API Error] Cause:", (error as any)?.cause);
        return new Response(
            JSON.stringify({ error: "Failed to process request", details: String(error) }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        )
    }
}

