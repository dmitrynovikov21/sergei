
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const history = await prisma.parseHistory.findMany({
        orderBy: { started_at: 'desc' },
        take: 1,
        include: {
            source: true
        }
    })
    console.log(JSON.stringify(history, null, 2))
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
