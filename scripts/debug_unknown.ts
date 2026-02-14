import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    // Find the 50K+ dataset
    const datasets = await prisma.dataset.findMany({ select: { id: true, name: true } })
    console.log('All datasets:', datasets.map(d => d.name))

    const ds = datasets.find(d => d.name.includes('50') || d.name.includes('Вирус'))
    if (!ds) { console.log('Dataset not found'); return }
    console.log('\nDataset:', ds.name, ds.id)

    // Get all items
    const items = await prisma.contentItem.findMany({
        where: { datasetId: ds.id },
        select: { id: true, sourceUrl: true, description: true, instagramId: true }
    })

    // Classify items
    const broken: typeof items = []
    const good: typeof items = []

    for (const item of items) {
        if (!item.sourceUrl) {
            broken.push(item)
            continue
        }
        const match = item.sourceUrl.match(/instagram\.com\/([^\/]+)/)
        if (!match || match[1] === 'p' || match[1] === 'reel') {
            broken.push(item)
        } else {
            good.push(item)
        }
    }

    console.log(`\nTotal: ${items.length}, Good: ${good.length}, Broken: ${broken.length}`)

    // Get tracking sources 
    const sources = await prisma.trackingSource.findMany({
        where: { datasetId: ds.id },
        select: { id: true, username: true, url: true }
    })
    console.log('\nTracking sources:', sources.map(s => s.username))

    // Check a few broken items
    console.log('\nSample broken items:')
    for (const item of broken.slice(0, 10)) {
        const mentions = item.description?.match(/@[\w.]+/g)
        console.log(`  sourceUrl: ${item.sourceUrl}`)
        console.log(`  mentions in description: ${mentions?.join(', ') || 'none'}`)
        console.log('---')
    }

    // Strategy: use description @mentions to match tracking sources
    const sourceUsernames = new Set(sources.map(s => s.username?.toLowerCase()).filter(Boolean))
    let fixable = 0
    const fixMap = new Map<string, string>() // itemId -> username

    for (const item of broken) {
        const mentions = item.description?.match(/@[\w.]+/g)
        if (mentions) {
            for (const mention of mentions) {
                const username = mention.slice(1).toLowerCase()
                if (sourceUsernames.has(username)) {
                    fixMap.set(item.id, username)
                    fixable++
                    break
                }
            }
        }
    }
    console.log(`\nFixable via @mentions: ${fixable} out of ${broken.length}`)

    // Check the main dataset for matching instagramIds 
    const mainDs = datasets.find(d => d.name !== ds.name && !d.name.includes('50'))
    if (mainDs) {
        console.log(`\nChecking main dataset: ${mainDs.name}`)
        const mainItems = await prisma.contentItem.findMany({
            where: { datasetId: mainDs.id },
            select: { instagramId: true, sourceUrl: true }
        })

        const mainMap = new Map<string, string>()
        for (const mi of mainItems) {
            if (mi.sourceUrl) {
                const m = mi.sourceUrl.match(/instagram\.com\/([^\/]+)/)
                if (m && m[1] !== 'p' && m[1] !== 'reel') {
                    mainMap.set(mi.instagramId, m[1])
                }
            }
        }

        let crossFixable = 0
        for (const item of broken) {
            if (!fixMap.has(item.id) && mainMap.has(item.instagramId)) {
                fixMap.set(item.id, mainMap.get(item.instagramId)!)
                crossFixable++
            }
        }
        console.log(`Cross-fixable from main dataset: ${crossFixable}`)
        console.log(`Total fixable: ${fixMap.size}`)
    }

    // Show remaining unfixable
    const remaining = broken.filter(b => !fixMap.has(b.id))
    console.log(`\nStill unfixable: ${remaining.length}`)
    if (remaining.length > 0) {
        console.log('Sample unfixable sourceUrls:')
        remaining.slice(0, 5).forEach(r => console.log(`  ${r.sourceUrl}`))
    }
}

main().catch(console.error).finally(() => prisma.$disconnect())
