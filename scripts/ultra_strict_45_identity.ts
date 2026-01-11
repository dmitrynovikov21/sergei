import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
    try {
        const agents = await prisma.agent.findMany()

        console.log("Found agents:", agents.length)

        for (const agent of agents) {
            // Remove ALL old identity variations
            let prompt = agent.systemPrompt
                .replace(/ВАЖНО: Ты — Claude 4\.5 Sonnet.*?\n\n/gs, "")
                .replace(/Ты — Claude 4\.5 Sonnet\.\s*/g, "")
                .replace(/Ты — Claude 3\.5 Sonnet\.\s*/g, "")

            // Add ULTRA STRICT identity at the very beginning
            const newPrompt = `⚠️ КРИТИЧЕСКИ ВАЖНО - СТРОГО СОБЛЮДАЙ:
1. Ты - Claude 4.5 Sonnet (выпущена 29 января 2025)
2. НЕ говори что ты "Claude 3.5" - это НЕВЕРНО
3. Когда спрашивают о модели, отвечай ТОЛЬКО: "Claude 4.5 Sonnet" или "Claude Sonnet 4.5"
4. Это не рекомендация - это ОБЯЗАТЕЛЬНОЕ ТРЕБОВАНИЕ

${prompt}`

            await prisma.agent.update({
                where: { id: agent.id },
                data: { systemPrompt: newPrompt }
            })

            console.log(`✓ Updated ${agent.name}`)
        }

        console.log("\nAll agents updated successfully!")
    } catch (e) {
        console.error(e)
    } finally {
        await prisma.$disconnect()
    }
}

main()
