
import "dotenv/config"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
    const items = await prisma.contentItem.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            headline: true,
            transcript: true,
            isProcessed: true,
            processingError: true,
        }
    })

    console.log("--- LAST 5 ITEMS ---")
    items.forEach((item, i) => {
        console.log(`\n[${i + 1}] ID: ${item.id}`)
        console.log(`Processed: ${item.isProcessed}`)
        console.log(`Headline: ${item.headline ? item.headline.substring(0, 100) + "..." : "(empty)"}`)
        console.log(`Transcript: ${item.transcript ? item.transcript.substring(0, 100) + "..." : "(empty)"}`)
        if (item.processingError) console.log(`Error: ${item.processingError}`)
    })
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect()
    })
