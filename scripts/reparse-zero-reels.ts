/**
 * Re-parse accounts that got 0 reels from instagram-scraper
 * Uses instagram-reel-scraper (dedicated reel scraper) for these accounts
 * 
 * Usage: npx tsx scripts/reparse-zero-reels.ts
 */

import { ApifyClient } from 'apify-client'
import { prisma } from '../lib/db'
import { analyzeAndSaveContentItems } from '../lib/parser/ai-analyzer'
import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'

const DATASET_ID = 'c78b0e15a63700581c8a657ce'
const DAYS_LIMIT = 14
const APIFY_TOKEN = process.env.APIFY_TOKEN!
const IG_USERNAME = process.env.IG_USERNAME
const IG_PASSWORD = process.env.IG_PASSWORD

// Accounts that got 0 reels from instagram-scraper
const ACCOUNTS = [
    'polishuk01',
    'demin_trader',
    'psy.gleb',
    'panchenko_sport',
    'mikhailshmt',
    'izhmukov_777',
]

const LOG_DIR = path.join(__dirname, '../data/parse-logs')

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

function saveRawJson(username: string, data: any[]) {
    const file = path.join(LOG_DIR, `raw_reparse_${username}_${Date.now()}.json`)
    fs.writeFileSync(file, JSON.stringify(data, null, 2))
    console.log(`  💾 Saved raw JSON: ${file} (${data.length} items)`)
}

async function scrapeReels(username: string): Promise<any[]> {
    const client = new ApifyClient({ token: APIFY_TOKEN })

    const runInput: any = {
        username: [username],
        resultsLimit: 500,
    }

    if (IG_USERNAME && IG_PASSWORD) {
        runInput.loginUsername = IG_USERNAME
        runInput.loginPassword = IG_PASSWORD
    }

    console.log(`  🔍 Calling instagram-reel-scraper for @${username}...`)

    const run = await client.actor('apify/instagram-reel-scraper').call(runInput, {
        waitSecs: 600
    })

    console.log(`  ✅ Status: ${run.status}`)

    if (run.status !== 'SUCCEEDED') {
        console.error(`  ❌ Failed: ${run.status}`)
        return []
    }

    const { items } = await client.dataset(run.defaultDatasetId).listItems()
    console.log(`  📦 Fetched ${items.length} raw items`)

    // Date filter
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - DAYS_LIMIT)

    const filtered = items.filter((item: any) => {
        if (!item.timestamp) return true
        return new Date(item.timestamp) >= cutoff
    })

    console.log(`  📅 After date filter (${DAYS_LIMIT}d): ${filtered.length} items`)
    return filtered
}

async function mergeIntoDatabase(username: string, posts: any[]) {
    let updated = 0, inserted = 0, skipped = 0
    const newItemIds: string[] = []

    for (const post of posts) {
        const instagramId = post.id || post.shortCode
        if (!instagramId) { skipped++; continue }

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

        const existing = await prisma.contentItem.findFirst({ where: { instagramId } })

        if (existing) {
            await prisma.contentItem.update({
                where: { id: existing.id },
                data: {
                    views, likes, comments,
                    viralityScore: Math.round(viralityScore * 10) / 10,
                    coverUrl: coverUrl || existing.coverUrl,
                    updatedAt: new Date(),
                }
            })
            updated++
        } else {
            const newItem = await prisma.contentItem.create({
                data: {
                    id: crypto.randomUUID().replace(/-/g, '').slice(0, 25),
                    instagramId, originalUrl, sourceUrl, coverUrl, videoUrl,
                    views, likes, comments, publishedAt, description,
                    headline: null,
                    viralityScore: Math.round(viralityScore * 10) / 10,
                    datasetId: DATASET_ID,
                    contentType: 'Video',
                }
            })
            inserted++
            newItemIds.push(newItem.id)
        }
    }
    return { updated, inserted, skipped, newItemIds }
}

async function main() {
    console.log('='.repeat(50))
    console.log('🔄 RE-PARSE ZERO-REELS ACCOUNTS (reel-scraper)')
    console.log('='.repeat(50))

    for (let i = 0; i < ACCOUNTS.length; i++) {
        const username = ACCOUNTS[i]
        console.log(`\n[${i + 1}/${ACCOUNTS.length}] 🎯 @${username}`)

        try {
            const posts = await scrapeReels(username)
            if (posts.length === 0) {
                console.log(`  ⚠️ No reels found`)
                continue
            }
            saveRawJson(username, posts)

            const result = await mergeIntoDatabase(username, posts)
            console.log(`  📊 updated=${result.updated}, new=${result.inserted}, skipped=${result.skipped}`)

            if (result.newItemIds.length > 0) {
                console.log(`  🤖 AI analysis on ${result.newItemIds.length} new items...`)
                try {
                    const analyzed = await analyzeAndSaveContentItems(result.newItemIds)
                    console.log(`  🤖 AI analyzed: ${analyzed}`)
                } catch (e: any) {
                    console.error(`  ⚠️ AI error: ${e.message}`)
                }
            }
            console.log(`  ✅ @${username} done!`)
        } catch (e: any) {
            console.error(`  ❌ @${username} error: ${e.message}`)
        }

        if (i < ACCOUNTS.length - 1) {
            console.log(`  ⏳ Pausing 10s...`)
            await sleep(10000)
        }
    }

    const total = await prisma.contentItem.count({ where: { datasetId: DATASET_ID } })
    console.log(`\n📦 Total items in dataset: ${total}`)
    await prisma.$disconnect()
}

main().catch(e => { console.error('FATAL:', e); process.exit(1) })
