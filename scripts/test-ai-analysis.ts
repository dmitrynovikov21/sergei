/**
 * Test Script: AI Content Analysis
 * 
 * DIRECT Apify call (bypasses parser-service)
 * Usage: npx tsx scripts/test-ai-analysis.ts
 */

import { prisma } from "../lib/db"
import { extractHeadlineFromCover } from "../lib/parser/parser-client"
import { analyzeAndSaveContentItems } from "../lib/parser/ai-analyzer"
import { v4 as uuidv4 } from "uuid"
import { ApifyClient } from "apify-client"

const TARGET_USERNAME = "kostenkovru"
const TARGET_DATASET_ID = "cmkwe6ul00001115xgdrh83xl"
const DAYS_LIMIT = 7  // Increased to get more posts

// Initialize Apify client
const apifyClient = new ApifyClient({
    token: process.env.APIFY_TOKEN
})

async function fetchReelsFromApify(username: string, _daysLimit: number) {
    console.log(`[Apify] Fetching reels for @${username}...`)

    const actorId = "apify/instagram-reel-scraper"

    const runInput = {
        username: [username],
        resultsLimit: 15  // Just get 15 reels for test
    }

    console.log(`[Apify] Running ${actorId}...`)

    const run = await apifyClient.actor(actorId).call(runInput, {
        waitSecs: 300
    })

    console.log(`[Apify] Run finished: ${run.status}`)

    const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems()
    console.log(`[Apify] Fetched ${items.length} items`)

    // Take first 10 items (reel-scraper doesn't have consistent timestamps)
    const limited = items.slice(0, 10)
    console.log(`[Apify] Using ${limited.length} items for test`)

    return limited
}

async function main() {
    console.log("=".repeat(60))
    console.log("🧪 AI CONTENT ANALYSIS TEST")
    console.log("=".repeat(60))
    console.log(`Target: @${TARGET_USERNAME}`)
    console.log(`Dataset: ${TARGET_DATASET_ID}`)
    console.log(`Days: ${DAYS_LIMIT}`)
    console.log("=".repeat(60))

    // Check Apify token
    if (!process.env.APIFY_TOKEN) {
        console.error("❌ APIFY_TOKEN not set!")
        process.exit(1)
    }

    // 1. Check dataset exists
    const dataset = await prisma.dataset.findUnique({
        where: { id: TARGET_DATASET_ID }
    })

    if (!dataset) {
        console.error(`❌ Dataset ${TARGET_DATASET_ID} not found!`)
        process.exit(1)
    }
    console.log(`✅ Dataset found: ${dataset.name}`)

    // 2. Fetch from Apify directly
    console.log(`\n📥 Fetching from Apify...`)

    const posts = await fetchReelsFromApify(TARGET_USERNAME, DAYS_LIMIT)

    if (posts.length === 0) {
        console.log("⚠️ No posts found!")
        process.exit(0)
    }

    // 3. Save to database
    console.log(`\n💾 Saving to database...`)
    const savedIds: string[] = []

    for (const post of posts as any[]) {
        const itemId = uuidv4()
        const instagramId = post.id || post.shortCode || String(post.timestamp)

        // Check if already exists
        const existing = await prisma.contentItem.findUnique({
            where: {
                instagramId_datasetId: {
                    instagramId,
                    datasetId: TARGET_DATASET_ID
                }
            }
        })

        if (existing) {
            console.log(`  ⏭️ Skip (exists): ${instagramId}`)
            continue
        }

        // Calculate virality score
        const views = post.videoViewCount || post.viewCount || post.videoPlayCount || 0
        const likes = post.likesCount || 0
        const comments = post.commentsCount || 0
        const viralityScore = views > 0 ? (likes + comments * 2) / (views / 1000) : 0

        // Parse date safely
        let publishedAt: Date | null = null
        if (post.timestamp) {
            const ts = typeof post.timestamp === 'number' ? post.timestamp * 1000 : Date.parse(post.timestamp)
            if (!isNaN(ts)) {
                publishedAt = new Date(ts)
            }
        }

        await prisma.contentItem.create({
            data: {
                id: itemId,
                instagramId,
                originalUrl: post.url || `https://instagram.com/reel/${post.shortCode}`,
                sourceUrl: `https://instagram.com/${TARGET_USERNAME}`,
                coverUrl: post.displayUrl || post.thumbnailUrl,
                videoUrl: post.videoUrl,
                views,
                likes,
                comments,
                publishedAt,
                description: post.caption?.slice(0, 2000),
                contentType: "Video",
                viralityScore,
                datasetId: TARGET_DATASET_ID
            }
        })

        savedIds.push(itemId)
        console.log(`  ✅ Saved: ${instagramId} (${views.toLocaleString()} views)`)
    }

    console.log(`\n✅ Saved ${savedIds.length} new items`)

    if (savedIds.length === 0) {
        console.log("⚠️ No new items to analyze")
        process.exit(0)
    }

    // 4. Extract headlines
    console.log(`\n🔍 Step 1: Extracting headlines...`)

    for (const id of savedIds) {
        const item = await prisma.contentItem.findUnique({ where: { id } })
        if (item?.coverUrl && !item.headline) {
            try {
                const headline = await extractHeadlineFromCover(item.coverUrl)
                if (headline) {
                    await prisma.contentItem.update({
                        where: { id },
                        data: { headline }
                    })
                    console.log(`  ✅ Headline: "${headline.slice(0, 50)}..."`)
                } else {
                    console.log(`  ⚠️ No text on cover`)
                }
            } catch (error) {
                console.log(`  ⚠️ Headline failed for ${id}`)
            }
        }
    }

    // 5. Run AI Analysis
    console.log(`\n🧠 Step 2: Running AI trend analysis...`)

    try {
        const analyzed = await analyzeAndSaveContentItems(savedIds)
        console.log(`✅ Analyzed ${analyzed} items`)
    } catch (error) {
        console.error(`❌ AI Analysis failed:`, error)
    }

    // 6. Show results
    console.log(`\n📊 RESULTS:`)
    console.log("=".repeat(60))

    const items = await prisma.contentItem.findMany({
        where: { id: { in: savedIds } },
        select: {
            id: true,
            headline: true,
            description: true,
            views: true,
            aiTopic: true,
            aiSubtopic: true,
            aiHookType: true,
            aiTags: true,
            aiSuccessReason: true,
            aiAnalyzedAt: true
        }
    })

    for (const item of items) {
        console.log(`\n📌 ${item.headline?.slice(0, 50) || item.description?.slice(0, 50) || "(no content)"}`)
        console.log(`   Views: ${item.views.toLocaleString()}`)
        console.log(`   Topic: ${item.aiTopic || "❌"} → ${item.aiSubtopic || ""}`)
        console.log(`   Hook: ${item.aiHookType || "❌"}`)
        console.log(`   Tags: ${item.aiTags || "❌"}`)
        console.log(`   Why: ${item.aiSuccessReason || "❌"}`)
        console.log(`   Analyzed: ${item.aiAnalyzedAt ? "✅" : "❌"}`)
    }

    // Summary
    console.log(`\n${"=".repeat(60)}`)
    console.log("📈 SUMMARY BY TOPIC:")

    const topicCounts = await prisma.contentItem.groupBy({
        by: ['aiTopic'],
        where: { datasetId: TARGET_DATASET_ID, aiTopic: { not: null } },
        _count: { id: true }
    })

    for (const tc of topicCounts) {
        console.log(`   ${tc.aiTopic}: ${tc._count.id} items`)
    }

    console.log(`\n✅ Test complete!`)
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
