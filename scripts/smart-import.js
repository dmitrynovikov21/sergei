/**
 * Smart Import: 
 * - natalia_rubtsovskaya: fetch from EXISTING Apify run dataset (no re-parse)
 * - demin_trader, psiholog_pavlokazarian: parse fresh (first time)
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { ApifyClient } = require('apify-client');
const crypto = require('crypto');

const prisma = new PrismaClient();
const apify = new ApifyClient({ token: process.env.APIFY_TOKEN });

const PARSER_URL = 'http://localhost:3001';
const DATASET_50K = '1ac12945-7926-4409-a36a-6b1b6d35dcb6';
const DATASET_MAIN = '26cd2b59-7ae0-426d-86fb-4abbb15ef846';
const VIEWS_THRESHOLD = 50000;
const DAYS_LIMIT = 90;

// natalia's already-completed Apify run
const NATALIA_RUN_ID = 'IJ84ThaFk66k926Qr';

// Only these two need fresh parsing
const FRESH_PROFILES = ['demin_trader', 'psiholog_pavlokazarian'];

async function fetchFromExistingRun(runId, username) {
    console.log(`\n📦 Fetching ${username} from existing Apify run ${runId}...`);
    const { items } = await apify.dataset((await apify.run(runId).get()).defaultDatasetId).listItems();
    console.log(`  Raw items from run: ${items.length}`);

    // Filter: valid, Video type, within date range
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - DAYS_LIMIT);

    const filtered = items.filter(item => {
        if (item.error) return false;
        // Detect type
        let type = item.type;
        if (!type) {
            if (item.isVideo || item.productType === 'clips' || item.videoUrl) type = 'Video';
            else if (item.childPosts?.length > 0) type = 'Sidecar';
            else type = 'Image';
        }
        item.type = type;
        if (type !== 'Video') return false;
        if (item.timestamp && new Date(item.timestamp) < cutoff) return false;
        // Ensure ownerUsername
        if (!item.ownerUsername) item.ownerUsername = username;
        return true;
    });

    console.log(`  ✅ ${username}: ${filtered.length} Reels (filtered from ${items.length})`);
    return filtered;
}

async function parseProfile(username) {
    console.log(`\n🔍 Parsing ${username} (FRESH)...`);
    const res = await fetch(`${PARSER_URL}/api/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, limit: 100, daysLimit: DAYS_LIMIT, contentTypes: 'Video' }),
        signal: AbortSignal.timeout(15 * 60 * 1000),
    });
    const data = await res.json();
    if (!data.success) {
        console.error(`  ❌ ${username}: ${data.error}`);
        return [];
    }
    console.log(`  ✅ ${username}: ${data.posts.length} Reels`);
    return data.posts;
}

async function savePost(post, datasetId) {
    const views = post.videoPlayCount || post.playCount || post.videoViewCount || post.viewCount || 0;
    const instagramId = post.id || post.shortCode;
    const existing = await prisma.contentItem.findFirst({ where: { instagramId, datasetId } });

    if (existing) {
        await prisma.contentItem.update({
            where: { id: existing.id },
            data: { views, likes: post.likesCount || 0, comments: post.commentsCount || 0, updatedAt: new Date() }
        });
        return 'updated';
    }

    await prisma.contentItem.create({
        data: {
            id: crypto.randomUUID(),
            instagramId,
            originalUrl: post.url || `https://www.instagram.com/reel/${post.shortCode}/`,
            sourceUrl: `https://instagram.com/${post.ownerUsername}`,
            coverUrl: post.displayUrl || null,
            videoUrl: post.videoUrl || null,
            views, likes: post.likesCount || 0, comments: post.commentsCount || 0,
            publishedAt: post.timestamp ? new Date(post.timestamp) : null,
            description: post.caption || null,
            viralityScore: null, contentType: 'Video', datasetId,
            isProcessed: false, isApproved: false
        }
    });
    return 'created';
}

async function addTrackingSource(username, datasetId) {
    const existing = await prisma.trackingSource.findFirst({ where: { username, datasetId } });
    if (existing) return;
    await prisma.trackingSource.create({
        data: { id: crypto.randomUUID(), url: `https://www.instagram.com/${username}/`, username, isActive: true, datasetId, lastScrapedAt: new Date() }
    });
    console.log(`  📌 Tracking source added: ${username}`);
}

async function processPosts(posts, username) {
    let stats = { '50k_created': 0, '50k_updated': 0, 'main_created': 0, 'main_updated': 0 };
    for (const post of posts) {
        const views = post.videoPlayCount || post.playCount || post.videoViewCount || post.viewCount || 0;
        const mainResult = await savePost(post, DATASET_MAIN);
        stats[`main_${mainResult}`]++;
        if (views >= VIEWS_THRESHOLD) {
            const r = await savePost(post, DATASET_50K);
            stats[`50k_${r}`]++;
        }
    }
    await addTrackingSource(username, DATASET_MAIN);
    if (stats['50k_created'] > 0 || stats['50k_updated'] > 0) {
        await addTrackingSource(username, DATASET_50K);
    }
    console.log(`  📊 ${username}: main=${stats.main_created} new/${stats.main_updated} upd | 50K+=${stats['50k_created']} new/${stats['50k_updated']} upd`);
}

async function main() {
    console.log('═══════════════════════════════════════');
    console.log('  SMART IMPORT (no duplicate parsing)');
    console.log('═══════════════════════════════════════');

    // 1. natalia — from existing run (NO re-parse)
    const nataliaPosts = await fetchFromExistingRun(NATALIA_RUN_ID, 'natalia_rubtsovskaya');
    await processPosts(nataliaPosts, 'natalia_rubtsovskaya');

    // 2. Fresh profiles — only these get parsed
    for (const username of FRESH_PROFILES) {
        const posts = await parseProfile(username);
        if (posts.length === 0) continue;
        await processPosts(posts, username);
    }

    const main = await prisma.contentItem.count({ where: { datasetId: DATASET_MAIN } });
    const viral = await prisma.contentItem.count({ where: { datasetId: DATASET_50K } });
    console.log(`\n═══════════════════════════════════════`);
    console.log(`  ИТОГО: основа пошла = ${main} | 50K+ = ${viral}`);
    console.log('═══════════════════════════════════════');
    await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
