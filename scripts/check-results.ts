
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
    const sources = await prisma.trackingSource.findMany()

    console.log("--- HARVEST STATUS ---")
    for (const source of sources) {
        const count = await prisma.contentItem.count({
            where: { datasetId: source.datasetId }
            // Note: ContentItem links to Dataset directly, but also we can infer from Source via URL if needed.
            // Actually, our schema might not link ContentItem -> TrackingSource directly, only Dataset.
            // Let's check logic: harvester links Item to Dataset.
        })

        // We can count items by sourceUrl (if it matches instagram.com/username)
        const username = source.username
        const items = await prisma.contentItem.count({
            where: {
                datasetId: source.datasetId,
                sourceUrl: { contains: username || undefined }
            }
        })

        console.log(`Source: ${source.username}`)
        console.log(`Items Found: ${items}`)
        console.log(`Last Scraped: ${source.lastScrapedAt}`)
        console.log("----------------------")
    }

    const processedItems = await prisma.contentItem.count({
        where: { isProcessed: true }
    })
    console.log(`Total Processed (AI): ${processedItems}`)
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect()
    })
