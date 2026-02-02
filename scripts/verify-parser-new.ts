
import { PrismaClient } from '@prisma/client'
import { processTrackingSource } from '../lib/parser/harvester'

const prisma = new PrismaClient()

async function main() {
    const username = 'durov'
    const datasetName = 'Verification Test Durov'

    console.log(`Creating dataset: ${datasetName}`)
    // 1. Create Dataset
    const dataset = await prisma.dataset.create({
        data: {
            name: datasetName,
            description: 'Automated verification test',
            userId: 'user_2jS1j9j9j9j9j9j9j9j9j9j9j9' // Mock user ID or fetch real one if needed, but schema might not enforce foreign key strictly or we use existing user
        }
    })

    // Check if user relation is required. The schema usually has User relation.
    // If userId is required and foreign key constraint exists, I need a valid user.
    // I'll fetch the first user from DB.

    /* 
       Actually, let's fetch a user first.
    */
}

// Re-write main to fetch user
async function run() {
    const user = await prisma.user.findFirst()
    if (!user) {
        throw new Error('No user found to attach dataset to')
    }

    const datasetName = 'Verification Test Durov'
    console.log(`Using user: ${user.email} (${user.id})`)

    let dataset = await prisma.dataset.findFirst({
        where: { name: datasetName }
    })

    if (!dataset) {
        dataset = await prisma.dataset.create({
            data: {
                name: datasetName,
                description: 'Automated verification test',
                userId: user.id
            }
        })
        console.log(`Created dataset: ${dataset.id}`)
    } else {
        console.log(`Using existing dataset: ${dataset.id}`)
    }

    const username = 'durov'
    const url = `https://www.instagram.com/${username}/`

    let source = await prisma.trackingSource.findFirst({
        where: { datasetId: dataset.id, username: username }
    })

    if (!source) {
        source = await prisma.trackingSource.create({
            data: {
                datasetId: dataset.id,
                username: username,
                url: url,
                daysLimit: 14,
                contentTypes: 'Image,Video,Sidecar' // scraped all
            }
        })
        console.log(`Created source: ${source.id}`)
    } else {
        console.log(`Using existing source: ${source.id}`)
    }

    console.log('Starting parse...')
    const result = await processTrackingSource(source.id)

    console.log('Parse Result:', JSON.stringify(result, null, 2))

    // Validation
    const itemCount = await prisma.contentItem.count({
        where: { datasetId: dataset.id }
    })
    console.log(`Total items in dataset: ${itemCount}`)

    if (itemCount > 0) {
        console.log('✅ Verification PASSED: Items were scraped and saved.')
    } else {
        console.log('❌ Verification FAILED: No items found.')
    }
}

run()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
