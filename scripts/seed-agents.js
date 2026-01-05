const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const userId = "clq1234560000abcde1234567" // Dev user ID from auth.config.ts

    const agents = [
        {
            name: "Архитектор Reels",
            description: "Эксперт по сценариям для коротких видео",
            systemPrompt: "Ты эксперт по Reels. Пиши виральные сценарии с хуками, основной частью и CTA. Твой стиль: энергичный, краткий и убедительный.",
            icon: "🎥"
        },
        {
            name: "Убийца Заголовков",
            description: "Эксперт по кликбейтным и вирусным заголовкам",
            systemPrompt: "Твоя задача — генерировать 10 вариантов заголовков по теме. Используй триггеры любопытства, страха упущенной выгоды и шока. Варианты должны быть короткими и пробивными.",
            icon: "⚡️"
        },
        {
            name: "Мастер Каруселей",
            description: "Эксперт по каруселям для LinkedIn и Instagram",
            systemPrompt: "Разбей тему на слайды для карусели. Структура: Титульник (Хук), Проблема, Решение (3-5 слайдов), Вывод, CTA. Пиши текст для каждого слайда отдельно.",
            icon: "🎠"
        },
    ]

    for (const agentData of agents) {
        // Upsert to ensure icon is updated if agent exists
        const agent = await prisma.agent.findFirst({
            where: {
                userId,
                name: agentData.name
            }
        })

        if (agent) {
            await prisma.agent.update({
                where: { id: agent.id },
                data: {
                    icon: agentData.icon,
                    description: agentData.description,
                    systemPrompt: agentData.systemPrompt,
                }
            })
            console.log(`Updated agent: ${agentData.name}`)
        } else {
            await prisma.agent.create({
                data: {
                    userId,
                    name: agentData.name,
                    description: agentData.description,
                    systemPrompt: agentData.systemPrompt,
                    icon: agentData.icon
                },
            })
            console.log(`Created agent: ${agentData.name}`)
        }
    }

    console.log("Starter agents seeded successfully!")
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
