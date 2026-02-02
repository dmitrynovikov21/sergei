
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const daysLimit = 14
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysLimit)

    console.log(`Cleaning up posts older than ${cutoffDate.toISOString()}...`)

    // Find zahar__bz source to get datasetId
    const source = await prisma.trackingSource.findFirst({
        where: { username: "zahar__bz" }
    })

    if (!source) {
        console.log("Source zahar__bz not found")
        return
    }

    const result = await prisma.contentItem.deleteMany({
        where: {
            datasetId: source.datasetId,
            publishedAt: {
                lt: cutoffDate
            }
        }
    })

    console.log(`Deleted ${result.count} old posts from database.`)
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
