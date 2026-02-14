/**
 * Smart Headlines Service
 * 
 * Provides AI tool calling support for fetching headlines from dataset.
 * Used by Claude to get real trend data before generating headlines.
 */

import { prisma } from "@/lib/db"

export interface SmartHeadline {
    headline: string
    views: string
    likes: string
    topic: string
    score: string
}

export interface SmartHeadlinesResult {
    headlines: SmartHeadline[]
    total: number
    source: string
}

/**
 * Format number to human readable (1200000 -> "1.2M")
 */
export function formatViews(num: number): string {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M'
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K'
    }
    return num.toString()
}

/**
 * Get smart headlines from dataset for AI tool calling
 * 
 * @param datasetId - Dataset to query
 * @param options.topic - Filter by topic (case-insensitive, partial match)
 * @param options.limit - Number of headlines (default: 15, max: 30)
 */
export async function getSmartHeadlines(
    datasetId: string,
    options?: {
        topic?: string
        limit?: number
    }
): Promise<SmartHeadlinesResult> {
    const limit = Math.min(options?.limit ?? 15, 30)
    const topic = options?.topic?.toLowerCase()

    // Build where clause
    const whereClause: any = {
        datasetId,
        headline: { not: null }
    }

    // Add topic filter if specified
    if (topic) {
        whereClause.OR = [
            { aiTopic: { contains: topic } },
            { headline: { contains: topic } }
        ]
    }

    const items = await prisma.contentItem.findMany({
        where: whereClause,
        orderBy: [
            { viralityScore: "desc" },
            { views: "desc" }
        ],
        take: limit,
        select: {
            headline: true,
            views: true,
            likes: true,
            aiTopic: true,
            viralityScore: true
        }
    })

    // Get dataset name for source
    const dataset = await prisma.dataset.findUnique({
        where: { id: datasetId },
        select: { name: true }
    })

    return {
        headlines: items.map(item => ({
            headline: item.headline!,
            views: formatViews(item.views),
            likes: formatViews(item.likes),
            topic: item.aiTopic || "general",
            score: item.viralityScore?.toFixed(1) || "—"
        })),
        total: items.length,
        source: dataset?.name || "dataset"
    }
}

/**
 * Tool definition for Anthropic API
 */
export const headlinesTool = {
    name: "get_headlines",
    description: `Получить виральные заголовки из базы трендов.

КОГДА ИСПОЛЬЗОВАТЬ:
- ВСЕГДА перед генерацией новых заголовков
- Когда нужно показать примеры успешных заголовков  
- Когда пользователь спрашивает "что сейчас залетает"

ВОЗВРАЩАЕТ: массив заголовков с метриками (просмотры, лайки, виральность)`,

    input_schema: {
        type: "object" as const,
        properties: {
            topic: {
                type: "string",
                description: "Тема для фильтрации (крипта, отношения, лайфхаки и т.д.). Не указывай если нужны все темы."
            },
            limit: {
                type: "number",
                description: "Количество заголовков (default: 15, max: 30)"
            }
        },
        required: []
    }
}

/**
 * Tool instructions to append to system prompt
 */
export const toolInstructionsPrompt = `

<tool_instructions>
## 🔧 ДОСТУПНЫЕ ИНСТРУМЕНТЫ

У тебя есть доступ к функции get_headlines() для получения трендовых заголовков из базы.

### КОГДА ВЫЗЫВАТЬ:
- ✅ Перед генерацией ЛЮБЫХ заголовков — ОБЯЗАТЕЛЬНО
- ✅ Когда пользователь просит "покажи примеры"
- ✅ Когда нужно понять что сейчас "залетает"

### КАК ИСПОЛЬЗОВАТЬ:
- get_headlines()                    → Топ 15 по виральности
- get_headlines(topic: "отношения")  → Топ по теме "отношения"
- get_headlines(limit: 20)           → 20 заголовков

### ВАЖНО:
- НЕ выдумывай заголовки из головы
- СНАЧАЛА вызови get_headlines(), ПОТОМ генерируй
- Твои заголовки должны ОПИРАТЬСЯ на паттерны из базы
- Указывай источник: "На основе заголовков с 2M+ просмотрами..."
</tool_instructions>
`
