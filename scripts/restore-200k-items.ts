/**
 * Restore 200K+ items re-parse script
 * 
 * Re-parses ALL 21 accounts using instagram-scraper (directUrls format)
 * Filters to items with >= 200K views
 * Merges into the user's main dataset (c78b0e15a63700581c8a657ce)
 * Uses @updatedAt for automatic timestamp tracking
 */

import { ApifyClient } from 'apify-client'
import { prisma } from '../lib/db'
import { analyzeAndSaveContentItems } from '../lib/parser/ai-analyzer'
import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'

const DATASET_ID = 'c78b0e15a63700581c8a657ce'
const MIN_VIEWS = 200_000
const DAYS_LIMIT = 14
const APIFY_TOKEN = process.env.APIFY_TOKEN!
const IG_USERNAME = process.env.IG_USERNAME
const IG_PASSWORD = process.env.IG_PASSWORD

const ACCOUNTS = [
    'lipodat_vadim',
    'mesedu.bulach',
    'demi_anfer',
    'wowviking',
    'dianissimmo',
    'nina_khodakovskaya',
    'neiro_gleb',
    'themayeralexander',
    'romanpopular',
    'polishuk01',
    'demin_trader',
    'avetisdemchenko',
    'psiholog_pavlokazarian',
    'dobmox',
    'bymorozov',
    'vladimir__hack',
    'psy.gleb',
    'panchenko_sport',
    'natalia_rubtsovskaya',
    'mikhailshmt',
    'izhmukov_777',
]

const LOG_DIR = path.join(__dirname, '../data/parse-logs')
const PROGRESS_FILE = path.join(LOG_DIR, 'restore-progress.json')

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

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

async function scrapeAccount(username: string): Promise<any[]> {
    const apifyClient = new ApifyClient({ token: APIFY_TOKEN })
    const directUrl = `https://www.instagram.com/${username}/`

    const runInput: any = {
        directUrls: [directUrl],
        resultsType: 'posts',
        resultsLimit: 500,
        searchType: 'user',
        onlyPostsNewerThan: `${DAYS_LIMIT} days`,
    }

    if (IG_USERNAME && IG_PASSWORD) {
        runInput.loginUsername = IG_USERNAME
        runInput.loginPassword = IG_PASSWORD
    }

    console.log(`  🔍 Calling instagram-scraper for @${username}...`)

    const run = await apifyClient.actor('apify/instagram-scraper').call(runInput, {
        waitSecs: 600
    })

    console.log(`  ✅ Status: ${run.status}`)

    if (run.status !== 'SUCCEEDED') {
        console.log(`  ❌ Failed, skipping`)
        return []
    }

    const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems()
    console.log(`  📦 Fetched ${items.length} items total`)

    // Filter: Reels only + >= 200K views
    const filtered = items.filter((item: any) => {
        const type = item.type || (item.isVideo || item.productType === 'clips' || item.videoUrl ? 'Video' : 'Other')
        if (type !== 'Video') return false

        const views = item.videoViewCount || item.playCount || item.viewCount || item.videoPlayCount || 0
        return views >= MIN_VIEWS
    })

    console.log(`  🎬 Reels >= ${MIN_VIEWS / 1000}K: ${filtered.length} items`)
    return filtered
}

interface MergeResult {
    updated: number
    inserted: number
    skipped: number
    newItemIds: string[]
}

async function mergeItems(posts: any[], username: string): Promise<MergeResult> {
    const result: MergeResult = { updated: 0, inserted: 0, skipped: 0, newItemIds: [] }

    for (const post of posts) {
        const instagramId = post.id || post.shortCode
        if (!instagramId) {
            result.skipped++
            continue
        }

        const views = post.videoViewCount || post.playCount || post.viewCount || post.videoPlayCount || 0
        const likes = post.likesCount || 0
        const comments = post.commentsCount || 0
        const coverUrl = post.displayUrl || null
        const videoUrl = post.videoUrl || null
        const originalUrl = post.url || `https://www.instagram.com/p/${post.shortCode}/`
        const sourceUrl = `https://www.instagram.com/${username}/`
        const publishedAt = post.timestamp ? new Date(post.timestamp) : null
        const description = post.caption || null
        const viralityScore = views > 0 ? ((likes + comments) / views) * 100 : 0

        try {
            const existing = await prisma.contentItem.findFirst({
                where: { instagramId, datasetId: DATASET_ID }
            })

            if (existing) {
                // Update stats — @updatedAt auto-sets timestamp
                if (existing.views !== views || existing.likes !== likes || existing.comments !== comments) {
                    await prisma.contentItem.update({
                        where: { id: existing.id },
                        data: {
                            views,
                            likes,
                            comments,
                            viralityScore: Math.round(viralityScore * 10) / 10,
                            coverUrl: coverUrl || existing.coverUrl,
                        }
                    })
                    result.updated++
                } else {
                    result.skipped++
                }
            } else {
                const newItem = await prisma.contentItem.create({
                    data: {
                        id: crypto.randomUUID().replace(/-/g, '').slice(0, 25),
                        instagramId,
                        originalUrl,
                        sourceUrl,
                        coverUrl,
                        videoUrl,
                        views,
                        likes,
                        comments,
                        publishedAt,
                        description,
                        viralityScore: Math.round(viralityScore * 10) / 10,
                        datasetId: DATASET_ID,
                        contentType: 'Video',
                    }
                })
                result.inserted++
                result.newItemIds.push(newItem.id)
            }
        } catch (err: any) {
            if (err?.code === 'P2002') {
                result.skipped++
            } else {
                console.error(`  ⚠️ Error:`, err.message)
            }
        }
    }

    return result
}

async function main() {
    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true })

    console.log('='.repeat(60))
    console.log('🔄 RESTORE 200K+ ITEMS')
    console.log(`📊 Dataset: ${DATASET_ID}`)
    console.log(`📅 Days: ${DAYS_LIMIT}, Min views: ${MIN_VIEWS / 1000}K`)
    console.log(`👥 Accounts: ${ACCOUNTS.length}`)
    console.log('='.repeat(60))

    const processed = loadProgress()
    const remaining = ACCOUNTS.filter(a => !processed.has(a))

    console.log(`\n✅ Already processed: ${processed.size}`)
    console.log(`📋 Remaining: ${remaining.length}\n`)

    let totalAdded = 0, totalUpdated = 0

    for (let i = 0; i < remaining.length; i++) {
        const username = remaining[i]
        console.log(`\n[${i + 1}/${remaining.length}] 🎯 @${username}`)

        try {
            const items = await scrapeAccount(username)

            if (items.length === 0) {
                console.log(`  ⚠️ No reels >= ${MIN_VIEWS / 1000}K views`)
            } else {
                const result = await mergeItems(items, username)
                console.log(`  📊 added=${result.inserted}, updated=${result.updated}, skipped=${result.skipped}`)
                totalAdded += result.inserted
                totalUpdated += result.updated

                // AI analysis for new items
                if (result.newItemIds.length > 0) {
                    console.log(`  🤖 AI analysis on ${result.newItemIds.length} new items...`)
                    try {
                        const analyzed = await analyzeAndSaveContentItems(result.newItemIds)
                        console.log(`  🤖 AI analyzed: ${analyzed} items`)
                    } catch (aiErr: any) {
                        console.error(`  ⚠️ AI error (non-fatal): ${aiErr.message}`)
                    }
                }
            }

            processed.add(username)
            saveProgress(processed)
            console.log(`  ✅ @${username} done!`)
        } catch (err: any) {
            console.error(`  ❌ Error: ${err.message}`)
        }

        // Pause between accounts
        if (i < remaining.length - 1) {
            await sleep(10000)
        }
    }

    const total = await prisma.contentItem.count({ where: { datasetId: DATASET_ID } })
    console.log(`\n${'='.repeat(60)}`)
    console.log(`📦 DONE! Total items in dataset: ${total}`)
    console.log(`   Added: ${totalAdded}, Updated: ${totalUpdated}`)
    console.log('='.repeat(60))

    await prisma.$disconnect()
}

main().catch(err => {
    console.error('FATAL:', err)
    process.exit(1)
})
