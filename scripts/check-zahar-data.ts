
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const source = await prisma.trackingSource.findFirst({
        where: { username: "zahar__bz" },
        include: {
            parseHistory: {
                orderBy: { createdAt: 'desc' },
                take: 5
            }
        }
    })

    if (!source) {
        console.log("Source not found")
        return
    }

    console.log(`Source: ${source.username} (${source.id})`)
    console.log("History:")
    source.parseHistory.forEach(h => {
        console.log(`  - ${h.createdAt}: Found=${h.postsFound}, Added=${h.itemsSaved}, Status=${h.status}`)
    })

    const items = await prisma.contentItem.findMany({
        where: { sourceId: source.id },
        select: { id: true, views: true, likes: true, headline: true, description: true },
        take: 5
    })

    console.log("\nSample Items:")
    items.forEach(i => {
        console.log(`  - ${i.id}: Views=${i.views}, Likes=${i.likes}, HL=${i.headline ? 'Yes' : 'No'}, Desc=${i.description ? 'Yes' : 'No'}`)
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
