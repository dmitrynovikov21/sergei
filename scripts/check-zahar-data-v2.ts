
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    // 1. Find the source
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

    // 2. Check History
    console.log("History:")
    source.parseHistory.forEach(h => {
        console.log(`  - ${h.createdAt}: Found=${h.postsFound}, Added=${h.postsAdded}, Status=${h.status}`)
    })

    // 3. Check Items
    // Find datasetId from source
    const items = await prisma.contentItem.findMany({
        where: { datasetId: source.datasetId, sourceUrl: { contains: "zahar__bz" } },
        select: { id: true, views: true, likes: true, headline: true, transcript: true },
        take: 10,
        orderBy: { publishedAt: 'desc' }
    })

    console.log(`\nFound ${items.length} sample items for this source in dataset ${source.datasetId}:`)
    items.forEach(i => {
        console.log(`  - ${i.id}: Views=${i.views}, Likes=${i.likes}, HL=${i.headline ? 'Yes' : 'No'}, Transcript=${i.transcript ? 'Yes' : 'No'}`)
    })

    const zeroViews = await prisma.contentItem.count({
        where: { datasetId: source.datasetId, sourceUrl: { contains: "zahar__bz" }, views: 0 }
    })
    console.log(`\nTotal items with 0 views: ${zeroViews}`)
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
