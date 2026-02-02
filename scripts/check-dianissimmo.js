const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function check() {
    // Find dianissimmo source
    const source = await prisma.trackingSource.findFirst({
        where: { username: 'dianissimmo' },
        include: {
            parseHistory: {
                orderBy: { startedAt: 'desc' },
                take: 3
            }
        }
    })

    if (!source) {
        console.log('❌ Source @dianissimmo not found')
        await prisma.$disconnect()
        return
    }

    console.log('📊 Source @dianissimmo:')
    console.log('  id:', source.id)
    console.log('  fetchLimit:', source.fetchLimit)
    console.log('  daysLimit:', source.daysLimit)
    console.log('  minViewsFilter:', source.minViewsFilter)
    console.log('  lastScrapedAt:', source.lastScrapedAt)

    console.log('\n📜 Parse History:')
    if (source.parseHistory.length === 0) {
        console.log('  No parse history yet')
    } else {
        source.parseHistory.forEach(h => {
            console.log(`\n  ${h.startedAt}:`)
            console.log(`    status: ${h.status}`)
            console.log(`    postsFound: ${h.postsFound}`)
            console.log(`    postsAdded: ${h.postsAdded}`)
            console.log(`    error: ${h.error}`)
            console.log(`    skipReasons: ${h.skipReasons}`)
        })
    }

    await prisma.$disconnect()
}
check().catch(console.error)
