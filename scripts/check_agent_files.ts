
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function check() {
    const agents = await prisma.agent.findMany({
        include: {
            files: true
        }
    })

    console.log(`Found ${agents.length} agents.`)
    for (const agent of agents) {
        console.log(`Agent: ${agent.name} (ID: ${agent.id})`)
        console.log(`- Files: ${agent.files.length}`)
        let totalSize = 0
        for (const file of agent.files) {
            console.log(`  - File: ${file.name} (Size: ${file.content.length} chars)`)
            totalSize += file.content.length
        }
        console.log(`- Total Context Size from Files: ${totalSize} chars`)
    }
}

check()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
