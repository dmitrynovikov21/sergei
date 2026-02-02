
import "dotenv/config"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
    // Get first user
    const user = await prisma.user.findFirst()
    if (!user) {
        console.log("No users found")
        return
    }

    console.log(`Testing context for user: ${user.email}\n`)

    // Get all datasets with items
    const datasets = await prisma.dataset.findMany({
        where: { userId: user.id },
        include: {
            items: {
                where: {
                    isProcessed: true,
                    headline: { not: null }
                },
                orderBy: { views: "desc" },
                take: 25
            }
        }
    })

    console.log(`Found ${datasets.length} datasets`)

    // Aggregate items
    const allItems = datasets.flatMap(d => d.items)
    console.log(`Total items with headlines: ${allItems.length}`)

    // Show sample headlines
    console.log("\n--- SAMPLE HEADLINES ---")
    allItems.slice(0, 5).forEach((item, i) => {
        console.log(`${i + 1}. ${item.headline}`)
    })

    console.log("\n--- SAMPLE TRANSCRIPTS ---")
    const withTranscripts = allItems.filter(i => i.transcript && i.transcript.length > 50)
    console.log(`Items with transcripts: ${withTranscripts.length}`)
    if (withTranscripts.length > 0) {
        console.log(`\nFirst transcript (${withTranscripts[0].headline}):`)
        console.log(withTranscripts[0].transcript?.slice(0, 200) + "...")
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect()
    })
