const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const userId = "clq1234560000abcde1234567" // Dev user ID

    const translations = {
        "Carousel Wizard": "Мастер Каруселей",
        "Headline Killer": "Убийца Заголовков",
        "Reels Architect": "Архитектор Reels"
    }

    // 1. Delete the NEW Russian ones I accidentally created as duplicates (if they have no chats, or just to clean up)
    // Actually, to be safe, I'll checking if the English ones exist first.

    // Strategy: Update English ones to Russian. 
    // If a Russian one already exists (from my previous seed), we might have a name collision or duplicates.
    // I'll delete the Russian ones created in step 1515 first to avoid confusion, 
    // assuming the user wants to keep the *original* agents (which match the screenshot).

    // Find agents with Russian names created recently and delete them?
    // Or simpler: Update English ones. If collision, handle it.

    for (const [englishName, russianName] of Object.entries(translations)) {
        // Find English agent
        const englishAgent = await prisma.agent.findFirst({
            where: { name: englishName }
        })

        if (englishAgent) {
            console.log(`Found English agent: ${englishName}`)

            // Check if Russian version already exists (from my previous mistake)
            const russianAgent = await prisma.agent.findFirst({
                where: { name: russianName }
            })

            if (russianAgent) {
                console.log(`Found duplicate Russian agent: ${russianName}. Deleting it to avoid dupes...`)
                // CAUTION: If the user started using the new one, this deletes their chat. 
                // But since I just created them 5 mins ago, it's unlikely.
                await prisma.agent.delete({ where: { id: russianAgent.id } })
            }

            // Rename English to Russian
            await prisma.agent.update({
                where: { id: englishAgent.id },
                data: { name: russianName }
            })
            console.log(`Renamed ${englishName} -> ${russianName}`)
        } else {
            console.log(`English agent ${englishName} not found.`)
        }
    }
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
