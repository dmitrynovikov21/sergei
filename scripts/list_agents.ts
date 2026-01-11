
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
    const agents = await prisma.agent.findMany()
    agents.forEach(a => {
        console.log(`"${a.name}" (ID: ${a.id}, Emoji: ${a.emoji})`)
    })
}

main()
