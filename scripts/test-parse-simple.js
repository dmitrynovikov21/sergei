const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
    // Get source
    const source = await prisma.trackingSource.findFirst({
        where: { username: 'd_vycheslavovich' }
    })

    if (!source) {
        console.log('❌ Source not found')
        return
    }

    console.log('📋 Source: @' + source.username)
    console.log('⚙️  Current settings:')
    console.log('   - minViewsFilter:', source.minViewsFilter)
    console.log('   - daysLimit:', source.daysLimit)
    console.log('   - contentTypes:', source.contentTypes)
    console.log('')

    // Get current content items count
    const itemsBefore = await prisma.contentItem.count({
        where: { datasetId: source.datasetId }
    })

    console.log('📊 Current dataset state:')
    console.log('   - Total items:', itemsBefore)
    console.log('')

    // Call processTrackingSource directly
    console.log('🚀 Starting parse with "Scrape All" strategy...')
    console.log('   (Filters disabled in code - should save everything)')
    console.log('')

    const { processTrackingSource } = require('../lib/parser/harvester.ts')
    const result = await processTrackingSource(source.id)

    console.log('')
    console.log('✅ Parse complete!')
    console.log('📊 Results:')
    console.log('   - Fetched from Instagram:', result.fetched)
    console.log('   - Saved (new):', result.saved)
    console.log('   - Updated (existing):', result.updated)
    console.log('   - Skipped:', result.skipped)

    if (result.skipReasons.length > 0) {
        console.log('')
        console.log('⚠️  Skip reasons:')
        result.skipReasons.forEach(r => {
            console.log(`   - ${r.reason}: ${r.count}`)
        })
    }

    if (result.errors.length > 0) {
        console.log('')
        console.log('❌ Errors:')
        result.errors.forEach(e => {
            console.log(`   - ${e}`)
        })
    }

    // Check items after
    const itemsAfter = await prisma.contentItem.count({
        where: { datasetId: source.datasetId }
    })

    console.log('')
    console.log('📈 Dataset change:')
    console.log(`   ${itemsBefore} → ${itemsAfter} (+${itemsAfter - itemsBefore} items)`)

    // Show recent items
    const recent = await prisma.contentItem.findMany({
        where: { datasetId: source.datasetId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
            instagramId: true,
            views: true,
            publishedAt: true,
            createdAt: true
        }
    })

    if (recent.length > 0) {
        console.log('')
        console.log('📝 Most recent items:')
        recent.forEach((item, i) => {
            console.log(`   ${i + 1}. ${item.instagramId}: ${item.views} views, published: ${item.publishedAt.toISOString().split('T')[0]}`)
        })
    }
}

main()
    .catch((e) => {
        console.error('Error:', e.message)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
