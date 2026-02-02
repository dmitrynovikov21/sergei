
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const sources = await prisma.trackingSource.findMany({
        take: 5
    })
    console.log(JSON.stringify(sources, null, 2))
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
