/**
 * Fix broken cover images
 * 
 * 1. Checks all coverUrls via HTTP HEAD to find broken ones
 * 2. Re-scrapes broken posts via Apify directUrls (post URL, not profile)
 * 3. Updates coverUrl in database
 * 
 * Usage: npx tsx scripts/fix-broken-covers.ts
 */

import { ApifyClient } from 'apify-client'
import { prisma } from '../lib/db'

const DATASET_ID = 'c78b0e15a63700581c8a657ce'
const APIFY_TOKEN = process.env.APIFY_TOKEN!
const IG_USERNAME = process.env.IG_USERNAME
const IG_PASSWORD = process.env.IG_PASSWORD

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

async function checkImageUrl(url: string): Promise<boolean> {
    try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 8000)
        const res = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal,
            redirect: 'follow',
        })
        clearTimeout(timeout)
        return res.ok
    } catch {
        return false
    }
}

async function findBrokenCovers() {
    const items = await prisma.contentItem.findMany({
        where: { datasetId: DATASET_ID },
        select: { id: true, coverUrl: true, originalUrl: true, instagramId: true }
    })

    console.log(`Checking ${items.length} items for broken covers...\n`)

    const broken: typeof items = []
    const noCover: typeof items = []

    for (let i = 0; i < items.length; i++) {
        const item = items[i]
        process.stdout.write(`[${i + 1}/${items.length}] ${item.instagramId}... `)

        if (!item.coverUrl) {
            console.log('❌ no URL')
            noCover.push(item)
            continue
        }

        const ok = await checkImageUrl(item.coverUrl)
        if (ok) {
            console.log('✅')
        } else {
            console.log('❌ broken')
            broken.push(item)
        }
    }

    return { broken, noCover }
}

async function reparsePostsBatch(postUrls: string[]): Promise<Map<string, string>> {
    const client = new ApifyClient({ token: APIFY_TOKEN })
    const coverMap = new Map<string, string>()

    // Apify instagram-scraper with directUrls pointing to individual posts
    const runInput: any = {
        directUrls: postUrls,
        resultsType: 'posts',
        resultsLimit: postUrls.length,
    }

    if (IG_USERNAME && IG_PASSWORD) {
        runInput.loginUsername = IG_USERNAME
        runInput.loginPassword = IG_PASSWORD
    }

    console.log(`\n  🔍 Calling Apify for ${postUrls.length} post URLs...`)

    const run = await client.actor('apify/instagram-scraper').call(runInput, {
        waitSecs: 300
    })

    if (run.status !== 'SUCCEEDED') {
        console.log(`  ❌ Run failed: ${run.status}`)
        return coverMap
    }

    const { items } = await client.dataset(run.defaultDatasetId).listItems()
    console.log(`  📦 Got ${items.length} results`)

    for (const item of items) {
        const url = item.url as string || ''
        const displayUrl = item.displayUrl as string
        if (displayUrl && url) {
            coverMap.set(url, displayUrl)
        }
    }

    return coverMap
}

async function main() {
    console.log('🖼️  FIX BROKEN COVERS')
    console.log(`📁 Dataset: ${DATASET_ID}`)
    console.log('═'.repeat(50))

    // Step 1: Find broken covers
    const { broken, noCover } = await findBrokenCovers()
    const allBad = [...broken, ...noCover]

    console.log(`\n${'─'.repeat(50)}`)
    console.log(`❌ Broken covers: ${broken.length}`)
    console.log(`❌ No cover URL: ${noCover.length}`)
    console.log(`📋 Total to fix: ${allBad.length}`)

    if (allBad.length === 0) {
        console.log('\n✅ All covers are good!')
        await prisma.$disconnect()
        return
    }

    // Step 2: Re-parse posts via Apify in batches of 20
    const BATCH = 20
    let fixed = 0

    for (let i = 0; i < allBad.length; i += BATCH) {
        const batch = allBad.slice(i, i + BATCH)
        const urls = batch.map(item => item.originalUrl).filter(Boolean)

        if (urls.length === 0) continue

        console.log(`\n[Batch ${Math.floor(i / BATCH) + 1}/${Math.ceil(allBad.length / BATCH)}]`)
        const coverMap = await reparsePostsBatch(urls)

        // Update DB
        for (const item of batch) {
            const newCover = coverMap.get(item.originalUrl)
            if (newCover) {
                await prisma.contentItem.update({
                    where: { id: item.id },
                    data: { coverUrl: newCover }
                })
                fixed++
                console.log(`  ✅ ${item.instagramId} → cover updated`)
            }
        }

        if (i + BATCH < allBad.length) await sleep(5000)
    }

    console.log(`\n${'═'.repeat(50)}`)
    console.log(`📊 Fixed: ${fixed}/${allBad.length}`)
    console.log('═'.repeat(50))

    await prisma.$disconnect()
}

main().catch(err => {
    console.error('FATAL:', err)
    process.exit(1)
})
