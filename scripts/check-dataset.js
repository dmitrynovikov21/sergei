const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function check() {
    const datasetId = 'cmks7gzre00074z2hwrkmphtn'

    // Get tracking sources
    const sources = await prisma.trackingSource.findMany({
        where: { datasetId },
        include: {
            parseHistory: {
                orderBy: { startedAt: 'desc' },
                take: 2
            }
        }
    })

    console.log('📊 Tracking Sources:')
    sources.forEach(s => {
        console.log(`\n@${s.username}:`)
        console.log(`  minViewsFilter: ${s.minViewsFilter}`)
        console.log(`  fetchLimit: ${s.fetchLimit}`)
        console.log(`  daysLimit: ${s.daysLimit || 'not set'}`)

        if (s.parseHistory.length > 0) {
            const h = s.parseHistory[0]
            console.log(`  Last parse: ${h.startedAt}`)
            console.log(`    postsFound: ${h.postsFound}`)
            console.log(`    postsAdded: ${h.postsAdded}`)
            console.log(`    skipReasons: ${h.skipReasons}`)
        }
    })

    // Count content
    const count = await prisma.contentItem.count({
        where: { datasetId }
    })
    console.log(`\n📦 Total content items: ${count}`)

    // Get oldest and newest
    const oldest = await prisma.contentItem.findFirst({
        where: { datasetId },
        orderBy: { publishedAt: 'asc' },
        select: { publishedAt: true }
    })
    const newest = await prisma.contentItem.findFirst({
        where: { datasetId },
        orderBy: { publishedAt: 'desc' },
        select: { publishedAt: true }
    })

    console.log(`📅 Date range: ${oldest?.publishedAt} to ${newest?.publishedAt}`)

    await prisma.$disconnect()
}
check().catch(console.error)
