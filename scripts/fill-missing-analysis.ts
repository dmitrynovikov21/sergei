/**
 * Fill missing headlines and topics for ContentItems
 * 
 * Uses:
 * - Parser service /api/extract-headline (Claude Vision) — for missing headlines
 * - AI Analyzer (OpenAI) — for missing topics
 * 
 * Does NOT use Apify — zero Apify token cost.
 * 
 * Usage: npx tsx scripts/fill-missing-analysis.ts
 */

import { prisma } from '../lib/db'
import { extractHeadlineFromCover } from '../lib/parser/parser-client'
import { analyzeAndSaveContentItems } from '../lib/parser/ai-analyzer'

const DATASET_ID = 'c78b0e15a63700581c8a657ce'

// Headline validation (same as in harvester.ts)
function isValidHeadline(headline: string): boolean {
    const h = headline.trim()
    if (h.length < 3) return false

    const aiDescriptionPatterns = [
        /не\s*могу\s*идентифицировать/i,
        /изображен[а-яё]*\s+(мужчин|женщин|человек|лиц)/i,
        /на\s+фоне\s+(синего|красного|зелёного|белого|чёрного|серого)/i,
        /вижу\s+(мужчин|женщин|человек)/i,
        /одет[а-яё]*\s+в\s/i,
        /с\s+(тёмными|светлыми|короткими|длинными)\s+(волосами|кудрями)/i,
        /с\s+бородой/i,
        /на\s+фотографии/i,
        /на\s+изображении/i,
        /на\s+снимке/i,
        /cannot\s+identify/i,
        /i\s+see\s+a\s+(man|woman|person)/i,
    ]

    for (const pattern of aiDescriptionPatterns) {
        if (pattern.test(h)) return false
    }

    if (/^[A-Za-z]+$/.test(h) && h.length < 15) return false

    return true
}

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

async function fillMissingHeadlines() {
    console.log('\n📝 STEP 1: Fill missing headlines')
    console.log('═'.repeat(50))

    const items = await prisma.contentItem.findMany({
        where: {
            datasetId: DATASET_ID,
            coverUrl: { not: null },
            OR: [
                { headline: null },
                { headline: '' },
            ]
        },
        select: { id: true, coverUrl: true, instagramId: true }
    })

    console.log(`Found ${items.length} items missing headlines (with cover)\n`)

    let filled = 0, failed = 0, rejected = 0

    for (let i = 0; i < items.length; i++) {
        const item = items[i]
        console.log(`[${i + 1}/${items.length}] Extracting from ${item.instagramId}...`)

        try {
            const rawHeadline = await extractHeadlineFromCover(item.coverUrl!)

            if (rawHeadline && isValidHeadline(rawHeadline)) {
                await prisma.contentItem.update({
                    where: { id: item.id },
                    data: { headline: rawHeadline }
                })
                console.log(`  ✅ "${rawHeadline.slice(0, 60)}..."`)
                filled++
            } else {
                console.log(`  ⚠️ Rejected: "${rawHeadline?.slice(0, 40) || 'null'}"`)
                rejected++
            }
        } catch (err: any) {
            console.log(`  ❌ ${err.message.slice(0, 50)}`)
            failed++
        }

        // Small delay to not overwhelm parser service
        if (i < items.length - 1) await sleep(1000)
    }

    console.log(`\n📝 Headlines: filled=${filled}, rejected=${rejected}, failed=${failed}`)
    return filled
}

async function fillMissingTopics() {
    console.log('\n🏷️ STEP 2: Fill missing topics (AI analysis)')
    console.log('═'.repeat(50))

    const items = await prisma.contentItem.findMany({
        where: {
            datasetId: DATASET_ID,
            OR: [
                { aiTopic: null },
                { aiTopic: '' },
            ]
        },
        select: { id: true, instagramId: true, headline: true }
    })

    console.log(`Found ${items.length} items missing aiTopic\n`)

    if (items.length === 0) return 0

    // Process in batches of 10
    const BATCH_SIZE = 10
    let totalAnalyzed = 0

    for (let i = 0; i < items.length; i += BATCH_SIZE) {
        const batch = items.slice(i, i + BATCH_SIZE)
        const batchIds = batch.map(item => item.id)

        console.log(`[Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(items.length / BATCH_SIZE)}] Analyzing ${batchIds.length} items...`)

        try {
            const analyzed = await analyzeAndSaveContentItems(batchIds)
            console.log(`  ✅ Analyzed: ${analyzed} items`)
            totalAnalyzed += analyzed
        } catch (err: any) {
            console.log(`  ❌ Batch error: ${err.message.slice(0, 50)}`)
        }

        if (i + BATCH_SIZE < items.length) await sleep(2000)
    }

    console.log(`\n🏷️ Topics: analyzed=${totalAnalyzed}`)
    return totalAnalyzed
}

async function main() {
    console.log('🔄 FILL MISSING ANALYSIS DATA')
    console.log(`📁 Dataset: ${DATASET_ID}`)
    console.log('═'.repeat(50))

    // Stats before
    const total = await prisma.contentItem.count({ where: { datasetId: DATASET_ID } })
    const headlinesBefore = await prisma.contentItem.count({ where: { datasetId: DATASET_ID, headline: { not: null } } })
    const topicsBefore = await prisma.contentItem.count({ where: { datasetId: DATASET_ID, aiTopic: { not: null } } })

    console.log(`\nBefore: ${total} total, ${headlinesBefore} headlines, ${topicsBefore} topics`)

    // Step 1: Headlines
    await fillMissingHeadlines()

    // Step 2: Topics
    await fillMissingTopics()

    // Stats after
    const headlinesAfter = await prisma.contentItem.count({ where: { datasetId: DATASET_ID, headline: { not: null } } })
    const topicsAfter = await prisma.contentItem.count({ where: { datasetId: DATASET_ID, aiTopic: { not: null } } })

    console.log(`\n${'═'.repeat(50)}`)
    console.log('📊 FINAL RESULTS')
    console.log(`   Headlines: ${headlinesBefore} → ${headlinesAfter} (+${headlinesAfter - headlinesBefore})`)
    console.log(`   Topics:    ${topicsBefore} → ${topicsAfter} (+${topicsAfter - topicsBefore})`)
    console.log(`   Total:     ${total} items`)
    console.log('═'.repeat(50))

    await prisma.$disconnect()
}

main().catch(err => {
    console.error('FATAL:', err)
    process.exit(1)
})
