import { PrismaClient } from '@prisma/client'
import { processTrackingSource } from '../lib/parser/harvester.js'

const prisma = new PrismaClient()

async function main() {
    // Find the d_vycheslavovich source
    const source = await prisma.trackingSource.findFirst({
        where: { username: 'd_vycheslavovich' }
    })

    if (!source) {
        console.log('Source not found')
        return
    }

    console.log('Testing parsing for source:', source.username)
    console.log('Current settings:')
    console.log('  - minViewsFilter:', source.minViewsFilter)
    console.log('  - daysLimit:', source.daysLimit)
    console.log('  - contentTypes:', source.contentTypes)
    console.log('')

    console.log('Starting parse...')
    const result = await processTrackingSource(source.id)

    console.log('')
    console.log('Results:')
    console.log('  - Fetched:', result.fetched)
    console.log('  - Saved:', result.saved)
    console.log('  - Updated:', result.updated)
    console.log('  - Skipped:', result.skipped)

    if (result.skipReasons.length > 0) {
        console.log('')
        console.log('Skip reasons:')
        result.skipReasons.forEach(r => {
            console.log(`  - ${r.reason}: ${r.count}`)
        })
    }

    if (result.errors.length > 0) {
        console.log('')
        console.log('Errors:')
        result.errors.forEach(e => {
            console.log(`  - ${e}`)
        })
    }

    // Check the database for recent items
    const items = await prisma.contentItem.findMany({
        where: { datasetId: source.datasetId },
        orderBy: { createdAt: 'desc' },
        take: 5
    })

    console.log('')
    console.log('Recent items in dataset:')
    items.forEach(item => {
        console.log(`  - ${item.instagramId}: ${item.views} views, published: ${item.publishedAt}`)
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
