
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
    try {
        const agents = await prisma.agent.findMany({})

        console.log("Found agents:", agents.length)
        for (const agent of agents) {
            if (agent.systemPrompt.includes("Claude 4.5 Sonnet")) {
                console.log(`Skipping ${agent.name} (already updated)`)
                continue
            }

            const newPrompt = `Ты — Claude 4.5 Sonnet. ${agent.systemPrompt}`

            await prisma.agent.update({
                where: { id: agent.id },
                data: { systemPrompt: newPrompt }
            })

            console.log(`Updated ${agent.name}`)
        }
    } catch (e) {
        console.error(e)
    } finally {
        await prisma.$disconnect()
    }
}

main()
