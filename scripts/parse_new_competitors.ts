import { processTrackingSource } from "../lib/parser/harvester"
import { prisma } from "../lib/db"

const USERNAMES = ["hmyrov63", "natalia_rubtsovskaya"]

async function main() {
    for (const username of USERNAMES) {
        const source = await prisma.trackingSource.findFirst({
            where: { username }
        })
        if (!source) {
            console.log(`❌ Source @${username} not found`)
            continue
        }
        console.log(`\n🚀 Parsing @${username} (${source.id})...`)
        try {
            const result = await processTrackingSource(source.id)
            console.log(`✅ @${username}: fetched=${result.fetched}, saved=${result.saved}, updated=${result.updated}`)
            if (result.skipReasons?.length > 0) {
                console.log(`   Skip reasons:`, result.skipReasons)
            }
            if (result.errors?.length > 0) {
                console.log(`   Errors:`, result.errors)
            }
        } catch (e: any) {
            console.log(`❌ @${username} error:`, e.message)
        }
    }

    await prisma.$disconnect()
    process.exit(0)
}

main()
