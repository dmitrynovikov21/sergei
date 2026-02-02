
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const items = await prisma.contentItem.findMany({
        where: {
            sourceUrl: { contains: 'zahar__bz' }
        },
        orderBy: { createdAt: 'desc' },
        take: 5
    })
    console.log(`Found ${items.length} items for zahar__bz`)
    if (items.length > 0) {
        console.log('Latest item:', items[0].instagramId)
    }
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
