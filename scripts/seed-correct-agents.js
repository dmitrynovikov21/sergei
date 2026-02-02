const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const userId = process.argv[2]

    if (!userId) {
        console.error('❌ Usage: node seed-correct-agents.js <userId>')
        process.exit(1)
    }

    console.log(`\n🌱 Creating system agents for user: ${userId}`)

    // Correct system agents matching existing DB structure
    const systemAgents = [
        {
            name: "Заголовки Reels",
            description: "Генератор виральных заголовков для Reels",
            systemPrompt: "Создавай цепляющие заголовки для Reels. Используй триггеры любопытства, FOMO и конкретные цифры. Длина до 60 символов.",
            emoji: "🎬",
            isPublic: true,
            model: "claude-3-5-sonnet-20241022"
        },
        {
            name: "Описание Reels",
            description: "Генератор описаний для Reels",
            systemPrompt: "Пиши увлекательные описания для Reels с хуком, основной частью и CTA. Используй эмодзи и теги.",
            emoji: "✍️",
            isPublic: true,
            model: "claude-3-5-sonnet-20241022"
        },
        {
            name: "Заголовки Каруселей",
            description: "Генератор заголовков для каруселей",
            systemPrompt: "Создавай цепляющие заголовки для каруселей LinkedIn/Instagram. Короткие, пробивные, с триггерами любопытства.",
            emoji: "🎠",
            isPublic: true,
            model: "claude-3-5-sonnet-20241022"
        },
        {
            name: "Структура Карусели",
            description: "Создание структуры карусели",
            systemPrompt: "Разрабатывай структуру образовательных каруселей: Титульник, Проблема, Решение (3-7 слайдов), Вывод, CTA. Каждый слайд - одна идея.",
            emoji: "📊",
            isPublic: true,
            model: "claude-3-5-sonnet-20241022"
        }
    ]

    // Delete any existing agents with these names for this user
    await prisma.agent.deleteMany({
        where: {
            userId,
            name: {
                in: systemAgents.map(a => a.name)
            }
        }
    })
    console.log('🗑️  Deleted existing agents (if any)\n')

    // Create all system agents
    for (const agentData of systemAgents) {
        await prisma.agent.create({
            data: {
                ...agentData,
                userId
            }
        })
        console.log(`✅ Created "${agentData.name}" ${agentData.emoji}`)
    }

    const finalCount = await prisma.agent.count({ where: { userId } })
    console.log(`\n🎉 Done! Total agents: ${finalCount}\n`)
}

main()
    .catch(e => {
        console.error('❌ Error:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
