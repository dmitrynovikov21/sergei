import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const source = await prisma.trackingSource.findFirst({
        where: { username: 'd_vycheslavovich' },
        include: { dataset: true }
    })

    if (!source) {
        console.log('Source not found')
        return
    }

    console.log('Source:', source.username)
    console.log('Settings:')
    console.log('  minViewsFilter:', source.minViewsFilter)
    console.log('  daysLimit:', source.daysLimit)
    console.log('  contentTypes:', source.contentTypes)
    console.log('')

    // Queue the parsing job
    const { Queue } = await import('bullmq')
    const queue = new Queue('content-processing', {
        connection: {
            host: 'localhost',
            port: 6379
        }
    })

    await queue.add('PARSE_SOURCE', {
        sourceId: source.id
    })

    console.log('✅ Parsing job queued!')
    console.log('Check worker logs for progress...')

    await queue.close()
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
