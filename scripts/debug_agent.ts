
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
    try {
        const agents = await prisma.agent.findMany({
            where: {
                name: {
                    contains: "Заголовки"
                }
            }
        })

        console.log("Found agents:", agents.length)
        for (const agent of agents) {
            console.log("--- AGENT ---")
            console.log("ID:", agent.id)
            console.log("Name:", agent.name)
            console.log("Model Key:", agent.model)
            console.log("System Prompt:", agent.systemPrompt)
            console.log("-------------")
        }
    } catch (e) {
        console.error(e)
    } finally {
        await prisma.$disconnect()
    }
}

main()
