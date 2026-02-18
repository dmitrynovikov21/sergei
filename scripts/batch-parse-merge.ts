/**
 * Batch Parse & Merge Script
 * 
 * Parses 21 Instagram accounts via Apify (1-2 at a time),
 * merges into existing dataset, updates stats for existing content,
 * inserts new content and sends to AI analysis.
 * 
 * Usage: npx tsx scripts/batch-parse-merge.ts
 */

import { ApifyClient } from 'apify-client'
import { prisma } from '../lib/db'
import { analyzeAndSaveContentItems } from '../lib/parser/ai-analyzer'
import * as fs from 'fs'
import * as path from 'path'

// ============================================
// CONFIG
// ============================================

const DATASET_ID = 'c78b0e15a63700581c8a657ce'
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

// Batch size: process N accounts per wave
const WAVE_SIZE = 1

// Tracking files
const LOG_DIR = path.join(__dirname, '../data/parse-logs')
const PROCESSED_FILE = path.join(LOG_DIR, 'processed-accounts.json')

// ============================================
// HELPERS
// ============================================

function ensureLogDir() {
    if (!fs.existsSync(LOG_DIR)) {
        fs.mkdirSync(LOG_DIR, { recursive: true })
    }
}

function getProcessedAccounts(): string[] {
    if (!fs.existsSync(PROCESSED_FILE)) return []
    return JSON.parse(fs.readFileSync(PROCESSED_FILE, 'utf-8'))
}

function markProcessed(username: string) {
    const processed = getProcessedAccounts()
    if (!processed.includes(username)) {
        processed.push(username)
        fs.writeFileSync(PROCESSED_FILE, JSON.stringify(processed, null, 2))
    }
}

function saveRawJson(username: string, data: any[]) {
    const file = path.join(LOG_DIR, `raw_${username}_${Date.now()}.json`)
    fs.writeFileSync(file, JSON.stringify(data, null, 2))
    console.log(`  💾 Saved raw JSON: ${file} (${data.length} items)`)
}

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

// ============================================
// APIFY SCRAPER (direct, no parser-service needed)
// ============================================

async function scrapeAccount(username: string): Promise<any[]> {
    const client = new ApifyClient({ token: APIFY_TOKEN })

    const runInput: any = {
        username: [username],
        resultsLimit: 500,
    }

    if (IG_USERNAME && IG_PASSWORD) {
        runInput.loginUsername = IG_USERNAME
        runInput.loginPassword = IG_PASSWORD
    }

    console.log(`  🔍 Calling Apify instagram-reel-scraper for @${username}...`)

    const run = await client.actor('apify/instagram-reel-scraper').call(runInput, {
        waitSecs: 600
    })

    console.log(`  ✅ Apify run finished. Status: ${run.status}`)

    if (run.status !== 'SUCCEEDED') {
        console.error(`  ❌ Run failed with status: ${run.status}`)
        return []
    }

    const { items } = await client.dataset(run.defaultDatasetId).listItems()
    console.log(`  📦 Fetched ${items.length} raw items from Apify`)

    // Filter by date (last N days)
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - DAYS_LIMIT)

    const filtered = items.filter((item: any) => {
        if (!item.timestamp) return true
        return new Date(item.timestamp) >= cutoff
    })

    console.log(`  📅 After date filter (${DAYS_LIMIT} days): ${filtered.length} items`)
    return filtered
}

// ============================================
// MERGE LOGIC
// ============================================

interface MergeResult {
    updated: number
    inserted: number
    skipped: number
    newItemIds: string[]
}

async function mergeIntoDatabase(username: string, posts: any[]): Promise<MergeResult> {
    const result: MergeResult = { updated: 0, inserted: 0, skipped: 0, newItemIds: [] }

    for (const post of posts) {
        const instagramId = post.id || post.shortCode
        if (!instagramId) {
            result.skipped++
            continue
        }

        // Extract data from Apify response
        const views = post.videoViewCount || post.playCount || post.viewCount || post.videoPlayCount || 0
        const likes = post.likesCount || 0
        const comments = post.commentsCount || 0
        const coverUrl = post.displayUrl || null
        const videoUrl = post.videoUrl || null
        const originalUrl = post.url || `https://www.instagram.com/p/${post.shortCode}/`
        const sourceUrl = `https://www.instagram.com/${username}/`
        const publishedAt = post.timestamp ? new Date(post.timestamp) : null
        const description = post.caption || null
        const headline = null // Will be extracted separately if needed

        // Calculate virality
        const viralityScore = views > 0 ? ((likes + comments) / views) * 100 : 0

        // Check if already exists
        const existing = await prisma.contentItem.findFirst({
            where: { instagramId }
        })

        if (existing) {
            // UPDATE stats only + coverUrl
            await prisma.contentItem.update({
                where: { id: existing.id },
                data: {
                    views,
                    likes,
                    comments,
                    viralityScore: Math.round(viralityScore * 10) / 10,
                    coverUrl: coverUrl || existing.coverUrl,
                    updatedAt: new Date(),
                }
            })
            result.updated++
        } else {
            // INSERT new content
            const newItem = await prisma.contentItem.create({
                data: {
                    instagramId,
                    originalUrl,
                    sourceUrl,
                    coverUrl,
                    videoUrl,
                    views,
                    likes,
                    comments,
                    publishedAt,
                    headline,
                    description,
                    viralityScore: Math.round(viralityScore * 10) / 10,
                    datasetId: DATASET_ID,
                    contentType: 'Video',
                }
            })
            result.inserted++
            result.newItemIds.push(newItem.id)
        }
    }

    return result
}

// ============================================
// MAIN
// ============================================

async function main() {
    ensureLogDir()

    console.log('='.repeat(60))
    console.log('🚀 BATCH PARSE & MERGE')
    console.log(`📊 Dataset: ${DATASET_ID}`)
    console.log(`📅 Days: ${DAYS_LIMIT}`)
    console.log(`👥 Accounts: ${ACCOUNTS.length}`)
    console.log('='.repeat(60))

    const processed = getProcessedAccounts()
    const remaining = ACCOUNTS.filter(a => !processed.includes(a))

    if (remaining.length === 0) {
        console.log('✅ All accounts already processed!')
        await prisma.$disconnect()
        return
    }

    console.log(`\n⏭️  Already processed: ${processed.length}`)
    console.log(`📋 Remaining: ${remaining.length}`)
    console.log(`   ${remaining.join(', ')}`)

    let totalUpdated = 0
    let totalInserted = 0
    let totalNewForAI: string[] = []

    for (let i = 0; i < remaining.length; i++) {
        const username = remaining[i]
        const progress = `[${i + 1}/${remaining.length}]`

        console.log(`\n${'─'.repeat(50)}`)
        console.log(`${progress} 🎯 Processing @${username}`)
        console.log('─'.repeat(50))

        try {
            // 1. Scrape from Apify
            const posts = await scrapeAccount(username)

            if (posts.length === 0) {
                console.log(`  ⚠️ No posts found for @${username}`)
                markProcessed(username)
                continue
            }

            // 2. Save raw JSON backup
            saveRawJson(username, posts)

            // 3. Merge into database
            const mergeResult = await mergeIntoDatabase(username, posts)
            console.log(`  📊 Results: updated=${mergeResult.updated}, new=${mergeResult.inserted}, skipped=${mergeResult.skipped}`)

            totalUpdated += mergeResult.updated
            totalInserted += mergeResult.inserted
            totalNewForAI.push(...mergeResult.newItemIds)

            // 4. AI analysis for NEW items only
            if (mergeResult.newItemIds.length > 0) {
                console.log(`  🤖 Running AI analysis on ${mergeResult.newItemIds.length} new items...`)
                try {
                    const analyzed = await analyzeAndSaveContentItems(mergeResult.newItemIds)
                    console.log(`  🤖 AI analyzed: ${analyzed} items`)
                } catch (aiError: any) {
                    console.error(`  ⚠️ AI analysis error (non-fatal): ${aiError.message}`)
                }
            }

            // 5. Mark as processed
            markProcessed(username)
            console.log(`  ✅ @${username} complete!`)

        } catch (error: any) {
            console.error(`  ❌ @${username} FAILED: ${error.message}`)
            // Continue to next account
        }

        // Pause between accounts to not overload Apify
        if (i < remaining.length - 1) {
            console.log(`  ⏳ Pausing 10s before next account...`)
            await sleep(10000)
        }
    }

    // Final summary
    console.log(`\n${'='.repeat(60)}`)
    console.log('📊 FINAL SUMMARY')
    console.log(`  Updated existing: ${totalUpdated}`)
    console.log(`  Inserted new: ${totalInserted}`)
    console.log(`  Sent to AI: ${totalNewForAI.length}`)
    console.log('='.repeat(60))

    // Verify final DB state
    const totalItems = await prisma.contentItem.count({
        where: { datasetId: DATASET_ID }
    })
    console.log(`\n📦 Total items in dataset: ${totalItems}`)

    await prisma.$disconnect()
}

main().catch(err => {
    console.error('FATAL:', err)
    process.exit(1)
})
