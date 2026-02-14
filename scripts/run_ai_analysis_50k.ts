/**
 * Run AI analysis on unanalyzed items in 50K+ dataset
 * 
 * Steps:
 * 1. Find all items without aiAnalyzedAt
 * 2. Extract headlines from covers (if missing)
 * 3. Run AI trend analysis in batches
 * 
 * Usage: npx tsx scripts/run_ai_analysis_50k.ts
 */

import { prisma } from "../lib/db"
import { extractHeadlineFromCover } from "../lib/parser/parser-client"
import { analyzeAndSaveContentItems } from "../lib/parser/ai-analyzer"

const DATASET_50K = "1ac12945-7926-4409-a36a-6b1b6d35dcb6"
const BATCH_SIZE = 10
const BATCH_PAUSE = 2000

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

async function main() {
    console.log("=".repeat(60))
    console.log("🧠 AI ANALYSIS: 50K+ Dataset")
    console.log("=".repeat(60))

    // 1. Get unanalyzed items
    const unanalyzed = await prisma.contentItem.findMany({
        where: {
            datasetId: DATASET_50K,
            aiAnalyzedAt: null
        },
        select: {
            id: true,
            headline: true,
            coverUrl: true,
            views: true,
            description: true
        },
        orderBy: { views: "desc" }
    })

    console.log(`\nItems needing analysis: ${unanalyzed.length}`)

    if (unanalyzed.length === 0) {
        console.log("✅ All items already analyzed!")
        return
    }

    // 2. Extract headlines for items that don't have them
    const needHeadline = unanalyzed.filter(i => !i.headline && i.coverUrl)
    console.log(`\n🔍 Step 1: Extracting headlines for ${needHeadline.length} items...`)

    let headlinesExtracted = 0
    for (let i = 0; i < needHeadline.length; i += BATCH_SIZE) {
        const batch = needHeadline.slice(i, i + BATCH_SIZE)
        const batchNum = Math.floor(i / BATCH_SIZE) + 1
        const totalBatches = Math.ceil(needHeadline.length / BATCH_SIZE)

        console.log(`  Batch ${batchNum}/${totalBatches}...`)

        await Promise.all(batch.map(async (item) => {
            try {
                const headline = await extractHeadlineFromCover(item.coverUrl!)
                if (headline) {
                    await prisma.contentItem.update({
                        where: { id: item.id },
                        data: { headline }
                    })
                    headlinesExtracted++
                }
            } catch {
                // Skip failed extractions
            }
        }))

        if (i + BATCH_SIZE < needHeadline.length) {
            await sleep(BATCH_PAUSE)
        }
    }

    console.log(`  ✅ Headlines extracted: ${headlinesExtracted}`)

    // 3. Run AI trend analysis in batches
    const itemIds = unanalyzed.map(i => i.id)
    console.log(`\n🧠 Step 2: Running AI trend analysis on ${itemIds.length} items...`)

    try {
        const analyzed = await analyzeAndSaveContentItems(itemIds)
        console.log(`\n✅ AI Analysis complete: ${analyzed} items analyzed`)
    } catch (error) {
        console.error("\n❌ AI Analysis error:", error)
    }

    // 4. Print results
    const total = await prisma.contentItem.count({ where: { datasetId: DATASET_50K } })
    const analyzed = await prisma.contentItem.count({
        where: { datasetId: DATASET_50K, aiAnalyzedAt: { not: null } }
    })

    console.log(`\n📊 Final: ${analyzed}/${total} analyzed`)

    // Topic distribution
    const topics = await prisma.contentItem.groupBy({
        by: ['aiTopic'],
        where: { datasetId: DATASET_50K, aiTopic: { not: null } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } }
    })

    console.log("\n📈 Topics:")
    for (const t of topics) {
        console.log(`  ${t.aiTopic}: ${t._count.id} items`)
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
