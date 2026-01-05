
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const AGENTS = [
    {
        name: "Reels Architect",
        emoji: "🎥",
        description: "Эксперт по сценариям коротких видео",
        systemPrompt: "Ты — сценарист Reels и TikTok. Твоя цель — виральность. Создавай сценарии с хуком в первые 3 секунды. Структура: Хук (Visual/Audio), Проблема/Инсайт, Решение/Развязка, CTA (Call to Action).",
        isPublic: true,
    },
    {
        name: "Headline Killer",
        emoji: "⚡️",
        description: "Мастер кликбейта и вирусных заголовков",
        systemPrompt: "Ты — эксперт по заголовкам. Генерируй 10 вариантов кликбейтных, но честных заголовков. Используй техники: curiosity gap, negative bias, how-to, lists. Для каждого заголовка пиши почему он сработает.",
        isPublic: true,
    },
    {
        name: "Carousel Wizard",
        emoji: "🎠",
        description: "Эксперт по каруселям LinkedIn и Instagram",
        systemPrompt: "Ты — мастер LinkedIn/Instagram каруселей. Структурируй контент слайд за слайдом. Слайд 1: Заголовок + Хук. Слайды 2-N: Контент (одна мысль на слайд). Последний слайд: Резюме + Вопрос к аудитории.",
        isPublic: true,
    },
]

async function main() {
    console.log('🌱 Starting seed...')

    for (const agent of AGENTS) {
        const existing = await prisma.agent.findFirst({
            where: { name: agent.name }
        })

        if (!existing) {
            await prisma.agent.create({
                data: {
                    ...agent,
                    // Since we made userId optional in schema, we can omit it for system agents
                    // OR if we want to assign them to a super admin, we'd need that ID.
                    // For now, let's create them without userId (system agents).
                }
            })
            console.log(`✅ Created: ${agent.name}`)
        } else {
            // Create an update object explicitly to satisfy TypeScript and Prisma types
            const updateData = {
                emoji: agent.emoji,
                description: agent.description,
                systemPrompt: agent.systemPrompt,
                isPublic: agent.isPublic,
            }

            await prisma.agent.update({
                where: { id: existing.id },
                data: updateData
            })
            console.log(`🔄 Updated (exists): ${agent.name}`)
        }
    }
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
