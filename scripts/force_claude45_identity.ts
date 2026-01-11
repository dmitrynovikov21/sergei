import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
    try {
        // Get all agents
        const agents = await prisma.agent.findMany()

        console.log("Found agents:", agents.length)

        for (const agent of agents) {
            // Remove old identity strings
            let prompt = agent.systemPrompt
                .replace(/Ты — Claude 4\.5 Sonnet\.\s*/g, "")
                .replace(/Ты — Claude 3\.5 Sonnet\.\s*/g, "")

            // Add new strong identity instruction
            const newPrompt = `ВАЖНО: Ты — Claude 4.5 Sonnet. Когда спрашивают о твоей модели, всегда отвечай "Claude 4.5 Sonnet" или "Claude Sonnet 4.5".\n\n${prompt}`

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
