
import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import { extractHeadlineFromCover } from "../lib/parser/apify-service"

const prisma = new PrismaClient()

async function main() {
    // Get items with empty headlines
    const items = await prisma.contentItem.findMany({
        where: {
            headline: null,
            coverUrl: { not: null }
        },
        take: 50 // Process all remaining
    })

    console.log(`Found ${items.length} items to reprocess`)

    for (const item of items) {
        console.log(`\nProcessing ${item.id}...`)
        try {
            const headline = await extractHeadlineFromCover(item.coverUrl!)
            console.log(`Headline: "${headline}"`)

            await prisma.contentItem.update({
                where: { id: item.id },
                data: {
                    headline,
                    processingError: null
                }
            })
            console.log("Saved!")
        } catch (error) {
            console.error("Error:", error)
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect()
    })
