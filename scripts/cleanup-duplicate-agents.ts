
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const names = [
        "Заголовки Reels",
        "Описание Reels",
        "Заголовки Каруселей",
        "Структура Карусели"
    ]

    for (const name of names) {
        // Find all public agents with this name
        const agents = await prisma.agent.findMany({
            where: { name, isPublic: true },
            orderBy: { createdAt: 'asc' }
        })

        if (agents.length <= 1) {
            console.log(`OK: "${name}" (${agents.length})`)
            continue
        }

        console.log(`Fixing: "${name}" (${agents.length})`)

        // Keep the one with userId: null (or the first one if both are null)
        // Prefer the one created earlier (Jan 22)
        const original = agents.find(a => a.userId === null) || agents[0]
        const duplicates = agents.filter(a => a.id !== original.id)

        console.log(`  Keeping: ${original.id} (user: ${original.userId})`)

        for (const dup of duplicates) {
            console.log(`  Deleting: ${dup.id} (user: ${dup.userId})`)

            // Delete related files first
            await prisma.agentFile.deleteMany({ where: { agentId: dup.id } })

            // Delete agent
            await prisma.agent.delete({ where: { id: dup.id } })
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
