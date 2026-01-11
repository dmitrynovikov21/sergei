"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

const DEFAULT_AGENTS = [
    {
        name: "Reels Architect",
        role: "Expert in short-form video scripts",
        systemPrompt: "Ты эксперт по Reels. Пиши виральные сценарии с хуками, основной частью и CTA. Твой стиль: энергичный, краткий и убедительный.",
        icon: "🎬"
    },
    {
        name: "Headline Killer",
        role: "Clickbait & Viral Headline Expert",
        systemPrompt: "Твоя задача — генерировать 10 вариантов заголовков по теме. Используй триггеры любопытства, страха упущенной выгоды и шока. Варианты должны быть короткими и пробивными.",
        icon: "⚡"
    },
    {
        name: "Carousel Wizard",
        role: "LinkedIn & Instagram Carousel Expert",
        systemPrompt: "Разбей тему на слайды для карусели. Структура: Титульник (Хук), Проблема, Решение (3-5 слайдов), Вывод, CTA. Пиши текст для каждого слайда отдельно.",
        icon: "🎠"
    },
    {
        name: "General Assistant",
        role: "Helpful AI Assistant",
        systemPrompt: "You are a helpful and polite AI assistant. Answer questions clearly and concisely.",
        icon: "🤖"
    },
    {
        name: "Схожие заголовки",
        role: "Expert in Viral Headline Variations",
        systemPrompt: "You are an expert in viral marketing and copywriting. Your task is to analyze the input headline and generate 10 variations using similar hooks, structures, and psychological triggers. Maintain the original tone but maximize click-through potential (CTR). Output exactly 10 numbered variations.",
        icon: "⚡"
    }
]

export async function seedDefaultAgents() {
    const session = await auth()

    if (!session?.user || !session.user.id) {
        throw new Error("Unauthorized")
    }

    const userId = session.user.id

    // Check if agents already exist to avoid duplicates (optional, but good practice)
    // For now, we just create them. If user wants to reset, they can delete old ones manually or we wipe them.
    // Let's just create new ones.

    const createdAgents: any[] = []

    for (const agentData of DEFAULT_AGENTS) {
        const agent = await prisma.agent.create({
            data: {
                userId,
                name: agentData.name,
                description: agentData.role, // Mapping role to description as per schema
                systemPrompt: agentData.systemPrompt,
                emoji: agentData.icon,
            },
        })
        createdAgents.push(agent)
    }

    revalidatePath("/dashboard/agents")
    return createdAgents
}
