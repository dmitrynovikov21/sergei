
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    // 1. Get Source
    const source = await prisma.trackingSource.findFirst({
        where: { username: "zahar__bz" }
    })

    if (!source) {
        console.log("Source not found")
        return
    }

    console.log(`Source: ${source.username} (${source.id})`)
    console.log(`Dataset: ${source.datasetId}`)

    // 2. Count items in this dataset
    const totalInDataset = await prisma.contentItem.count({
        where: { datasetId: source.datasetId }
    })
    console.log(`Total items in dataset: ${totalInDataset}`)

    // 3. Count items specific to this source
    const totalForSource = await prisma.contentItem.count({
        where: {
            datasetId: source.datasetId,
            sourceUrl: { contains: "zahar__bz" }
        }
    })
    console.log(`Total items for zahar__bz: ${totalForSource}`)

    // 4. Check for duplicates by instagramId
    const items = await prisma.contentItem.findMany({
        where: {
            datasetId: source.datasetId,
            sourceUrl: { contains: "zahar__bz" }
        },
        select: { instagramId: true, publishedAt: true }
    })

    const idCounts: Record<string, number> = {}
    items.forEach(i => {
        idCounts[i.instagramId] = (idCounts[i.instagramId] || 0) + 1
    })

    const duplicates = Object.entries(idCounts).filter(([id, count]) => count > 1)
    console.log(`Duplicates found: ${duplicates.length}`)
    if (duplicates.length > 0) {
        console.log("Sample duplicates:", duplicates.slice(0, 5))
    }

    // 5. Date distribution
    const now = new Date()
    const last14Days = items.filter(i => {
        if (!i.publishedAt) return false
        const diff = now.getTime() - i.publishedAt.getTime()
        const days = diff / (1000 * 3600 * 24)
        return days <= 14
    })
    console.log(`Items in last 14 days: ${last14Days.length}`)
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
