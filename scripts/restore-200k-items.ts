/**
 * Restore 200K+ items re-parse script
 * 
 * Re-parses ALL 21 accounts using instagram-scraper + instagram-reel-scraper
 * Filters to items with >= 200K views
 * Merges into the user's main dataset (c78b0e15a63700581c8a657ce)
 * Sets updatedAt on existing items that get updated stats
 */

import { ApifyClient } from 'apify-client'
import { PrismaClient } from '@prisma/client'
import * as crypto from 'crypto'
import * as dotenv from 'dotenv'
import * as fs from 'fs'

dotenv.config()

const prisma = new PrismaClient()
const client = new ApifyClient({ token: process.env.APIFY_TOKEN })

const DATASET_ID = 'c78b0e15a63700581c8a657ce'
const MIN_VIEWS = 200_000
const DAYS_LIMIT = 14

const ACCOUNTS = [
    'polishuk01',
    'demin_trader',
    'panchenko_sport',
    'mikhailshmt',
    'psy.gleb',
    'izhmukov_777',
    'kara_nigina',
    'alisher_morgenshtern',
    'reginka_official',
    'karolinakurkova',
    'siergiej.official',
    'garik_kharlamov',
    'laysan_utiasheva',
    'nataly_osmann',
    'nataliavorozhbit',
    'anastasivashukevich',
    'therock',
    'willsmith',
    'emmawatson',
    'zfrancescaofficial',
    'belfrancesco_'
]

const PROGRESS_FILE = '/root/sergei/data/parse-logs/restore-progress.json'

function loadProgress(): Set<string> {
    try {
        const data = fs.readFileSync(PROGRESS_FILE, 'utf-8')
        return new Set(JSON.parse(data))
    } catch {
        return new Set()
    }
}

function saveProgress(processed: Set<string>) {
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify([...processed], null, 2))
}

async function scrapeAccount(username: string): Promise<any[]> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - DAYS_LIMIT)
    const onlyPostsNewerThan = cutoffDate.toISOString().split('T')[0]

    console.log(`  🔍 Scraping @${username} (last ${DAYS_LIMIT} days, >=${MIN_VIEWS / 1000}K views)...`)

    // Use instagram-scraper for broader coverage
    const input = {
        "username": [username],
        "resultsLimit": 500,
        "onlyPostsNewerThan": onlyPostsNewerThan,
        "addParentData": true,
        "loginCookies": [],
        "proxy": {
            "useApifyProxy": true,
            "apifyProxyGroups": ["RESIDENTIAL"]
        }
    }

    // Add credentials if available
    if (process.env.IG_USERNAME && process.env.IG_PASSWORD) {
        (input as any).loginUsername = process.env.IG_USERNAME;
        (input as any).loginPassword = process.env.IG_PASSWORD
    }

    const run = await client.actor("apify/instagram-scraper").call(input, { timeout: 600 })

    console.log(`  ✅ Status: ${run.status}`)
    if (run.status !== 'SUCCEEDED') {
        console.log(`  ❌ Failed, skipping`)
        return []
    }

    const { items } = await client.dataset(run.defaultDatasetId).listItems({ limit: 1000 })
    console.log(`  📦 Fetched ${items.length} raw items`)

    // Filter by date and views
    const filtered = items.filter((item: any) => {
        const ts = item.timestamp ? new Date(item.timestamp) : null
        if (!ts || ts < cutoffDate) return false

        const views = item.videoViewCount || item.videoPlayCount || 0
        return views >= MIN_VIEWS
    })

    console.log(`  📅 After date+views filter (${DAYS_LIMIT}d, >=${MIN_VIEWS / 1000}K): ${filtered.length} items`)
    return filtered
}

async function mergeItems(items: any[], username: string): Promise<{ added: number; updated: number; skipped: number }> {
    let added = 0, updated = 0, skipped = 0

    for (const item of items) {
        try {
            const instagramId = item.id || item.shortCode || `${item.url}_${item.timestamp}`
            const views = item.videoViewCount || item.videoPlayCount || 0
            const likes = item.likesCount || 0
            const comments = item.commentsCount || 0
            const publishedAt = item.timestamp ? new Date(item.timestamp) : null
            const coverUrl = item.displayUrl || item.thumbnailUrl || null
            const videoUrl = item.videoUrl || null
            const originalUrl = item.url || `https://www.instagram.com/reel/${item.shortCode}/`
            const sourceUrl = `https://www.instagram.com/${username}/`
            const contentType = item.type === 'Video' ? 'Video' : item.type === 'Sidecar' ? 'Sidecar' : 'Image'
            const description = item.caption || null

            // Calculate virality
            const viralityScore = likes > 0 ? (views / likes) : 0

            const existing = await prisma.contentItem.findFirst({
                where: { instagramId, datasetId: DATASET_ID }
            })

            if (existing) {
                // Update stats if changed
                if (existing.views !== views || existing.likes !== likes || existing.comments !== comments) {
                    await prisma.contentItem.update({
                        where: { id: existing.id },
                        data: {
                            views,
                            likes,
                            comments,
                            viralityScore,
                            coverUrl: coverUrl || existing.coverUrl,
                            videoUrl: videoUrl || existing.videoUrl,
                            // updatedAt auto-set by @updatedAt
                        }
                    })
                    updated++
                } else {
                    skipped++
                }
            } else {
                await prisma.contentItem.create({
                    data: {
                        id: crypto.randomUUID(),
                        instagramId,
                        originalUrl,
                        sourceUrl,
                        coverUrl,
                        videoUrl,
                        views,
                        likes,
                        comments,
                        viralityScore,
                        publishedAt,
                        description,
                        contentType,
                        datasetId: DATASET_ID,
                    }
                })
                added++
            }
        } catch (err: any) {
            if (err?.code === 'P2002') {
                skipped++
            } else {
                console.error(`  ⚠️ Error:`, err.message)
            }
        }
    }

    return { added, updated, skipped }
}

async function main() {
    console.log(`🚀 Restore 200K+ items — re-parsing ${ACCOUNTS.length} accounts`)
    console.log(`📊 Filter: >= ${MIN_VIEWS / 1000}K views, last ${DAYS_LIMIT} days`)
    console.log(`📁 Target dataset: ${DATASET_ID}\n`)

    const processed = loadProgress()
    const remaining = ACCOUNTS.filter(a => !processed.has(a))
    console.log(`✅ Already processed: ${processed.size}, remaining: ${remaining.length}\n`)

    let totalAdded = 0, totalUpdated = 0

    for (let i = 0; i < remaining.length; i++) {
        const username = remaining[i]
        console.log(`[${i + 1}/${remaining.length}] 🎯 @${username}`)

        try {
            const items = await scrapeAccount(username)

            if (items.length === 0) {
                console.log(`  ⚠️ No items matching filter`)
            } else {
                const result = await mergeItems(items, username)
                console.log(`  📊 added=${result.added}, updated=${result.updated}, skipped=${result.skipped}`)
                totalAdded += result.added
                totalUpdated += result.updated
            }

            processed.add(username)
            saveProgress(processed)
        } catch (err: any) {
            console.error(`  ❌ Error: ${err.message}`)
        }

        console.log()
    }

    const total = await prisma.contentItem.count({ where: { datasetId: DATASET_ID } })
    console.log(`\n📦 DONE! Total items in dataset: ${total}`)
    console.log(`   Added: ${totalAdded}, Updated: ${totalUpdated}`)

    await prisma.$disconnect()
}

main().catch(console.error)
