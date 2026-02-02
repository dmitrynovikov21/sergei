
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const agents = await prisma.agent.findMany({
        select: { id: true, name: true, isPublic: true, userId: true, createdAt: true }
    })

    console.log(`Total agents: ${agents.length}`)

    // Group by name
    const byName: Record<string, typeof agents> = {}
    agents.forEach(a => {
        if (!byName[a.name]) byName[a.name] = []
        byName[a.name].push(a)
    })

    Object.entries(byName).forEach(([name, list]) => {
        if (list.length > 1) {
            console.log(`Duplicate: "${name}" (${list.length} copies)`)
            list.forEach(a => console.log(`  - ${a.id} (public: ${a.isPublic}, user: ${a.userId}) - ${a.createdAt}`))
        }
    })
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
