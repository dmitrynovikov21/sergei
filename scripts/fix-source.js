const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function fix() {
    const datasetId = 'cmks7gzre00074z2hwrkmphtn'

    // Update neiro_gleb source settings
    const updated = await prisma.trackingSource.updateMany({
        where: {
            datasetId,
            username: 'neiro_gleb'
        },
        data: {
            daysLimit: 14,
            fetchLimit: 500  // Increase to get more posts
        }
    })

    console.log('✅ Updated', updated.count, 'sources')
    console.log('  daysLimit: 14')
    console.log('  fetchLimit: 500')

    await prisma.$disconnect()
}
fix().catch(console.error)
