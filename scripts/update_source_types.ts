
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const source = await prisma.trackingSource.findFirst({
        where: { username: 'd_vycheslavovich' }
    })

    if (!source) {
        console.log('Source not found')
        return
    }

    console.log('Current contentTypes:', source.contentTypes)

    const updated = await prisma.trackingSource.update({
        where: { id: source.id },
        data: { contentTypes: 'Video,Image,Sidecar' }
    })

    console.log('Updated contentTypes:', updated.contentTypes)
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
