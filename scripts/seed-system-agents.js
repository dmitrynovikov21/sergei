const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const userId = process.argv[2]

    if (!userId) {
        console.error('❌ Usage: node seed-system-agents.js <userId>')
        console.error('Example: node seed-system-agents.js cmkoqz8ig0000q6455p0lrrx0')
        process.exit(1)
    }

    console.log(`\n🌱 Seeding system agents for user: ${userId}`)

    const systemAgents = [
        {
            name: "Архитектор Reels",
            description: "Эксперт по сценариям для коротких видео",
            systemPrompt: "Ты эксперт по созданию вирусных сценариев для Reels и коротких видео. Твоя задача — писать захватывающие сценарии с мощным хуком в первые 3 секунды, динамичной основной частью и убедительным CTA в конце. Используй техники сторителлинга, триггеры любопытства и эмоциональные якоря. Стиль: энергичный, краткий, убедительный.",
            emoji: "🎥",
            isPublic: true,
            model: "claude-3-5-sonnet-20241022"
        },
        {
            name: "Убийца Заголовков",
            description: "Эксперт по кликбейтным и вирусным заголовкам",
            systemPrompt: "Ты мастер создания вирусных заголовков. Твоя задача — генерировать 10 вариантов заголовков по любой теме. Используй психологические триггеры: любопытство, страх упущенной выгоды (FOMO), шок, контраст, конкретные цифры. Заголовки должны быть короткими (до 60 символов), пробивными и заставлять кликнуть немедленно.",
            emoji: "⚡️",
            isPublic: true,
            model: "claude-3-5-sonnet-20241022"
        },
        {
            name: "Мастер Каруселей",
            description: "Эксперт по каруселям для LinkedIn и Instagram",
            systemPrompt: "Ты специалист по созданию образовательных каруселей для LinkedIn и Instagram. Разбивай сложные темы на простые слайды. Структура: 1) Титульник с хуком, 2) Проблема/боль аудитории, 3-7) Решение по шагам (каждый слайд = 1 идея), 8) Вывод, 9) CTA. Пиши лаконично, используй списки и эмодзи для визуальной иерархии.",
            emoji: "🎠",
            isPublic: true,
            model: "claude-3-5-sonnet-20241022"
        }
    ]

    // Check existing agents
    const existingAgents = await prisma.agent.findMany({
        where: { userId },
        select: { id: true, name: true }
    })

    console.log(`\n📊 Current agents (${existingAgents.length}):`)
    existingAgents.forEach(a => console.log(`  - ${a.name} (${a.id})`))

    // Create missing agents
    let created = 0
    for (const agentData of systemAgents) {
        const exists = existingAgents.find(a => a.name === agentData.name)

        if (exists) {
            console.log(`⏭️  Skipping "${agentData.name}" - already exists`)
            continue
        }

        await prisma.agent.create({
            data: {
                ...agentData,
                userId
            }
        })
        created++
        console.log(`✅ Created "${agentData.name}"`)
    }

    console.log(`\n🎉 Done! Created ${created} new agent(s)`)

    // Show final count
    const finalCount = await prisma.agent.count({ where: { userId } })
    console.log(`📈 Total agents for user: ${finalCount}\n`)
}

main()
    .catch(e => {
        console.error('❌ Error:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
