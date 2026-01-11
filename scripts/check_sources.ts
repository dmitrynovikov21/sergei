
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
    const sources = await prisma.trackingSource.findMany({
        where: { isActive: true },
        include: { dataset: true }
    })

    console.log("Active Sources:", sources.length)
    sources.forEach(s => {
        console.log(`Source ${s.id} (${s.url}):`)
        console.log(`  ContentTypes: "${s.contentTypes}"`)
        console.log(`  MinViews: ${s.minViewsFilter}`)
        console.log(`  Dataset: ${s.dataset.name}`)
    })
}

main()
