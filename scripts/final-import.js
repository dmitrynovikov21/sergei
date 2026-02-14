/**
 * Final Import:
 * - demin_trader: from Apify cache (run ArauIyAtZrLJur0Jw)
 * - psiholog_pavlokazarian: fresh parse (not in cache)
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

async function fetchFromCache(runId, username) {
    console.log(`\n📦 ${username}: loading from Apify cache (run ${runId})...`);
    const run = await apify.run(runId).get();
    const { items } = await apify.dataset(run.defaultDatasetId).listItems();
    console.log(`  Raw items: ${items.length}`);
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - DAYS_LIMIT);
    const filtered = items.filter(item => {
        if (item.error) return false;
        let type = item.type;
        if (!type) {
            if (item.isVideo || item.productType === 'clips' || item.videoUrl) type = 'Video';
            else if (item.childPosts?.length > 0) type = 'Sidecar';
            else type = 'Image';
        }
        item.type = type;
        if (type !== 'Video') return false;
        if (item.timestamp && new Date(item.timestamp) < cutoff) return false;
        if (!item.ownerUsername) item.ownerUsername = username;
        return true;
    });
    console.log(`  ✅ Filtered: ${filtered.length} Reels`);
    return filtered;
}

async function parseFresh(username) {
    console.log(`\n🔍 ${username}: FRESH parse (not in cache)...`);
    const res = await fetch(`${PARSER_URL}/api/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, limit: 100, daysLimit: DAYS_LIMIT, contentTypes: 'Video' }),
        signal: AbortSignal.timeout(15 * 60 * 1000),
    });
    const data = await res.json();
    if (!data.success) { console.error(`  ❌ ${data.error}`); return []; }
    console.log(`  ✅ ${data.posts.length} Reels`);
    return data.posts;
}

async function savePost(post, datasetId) {
    const views = post.videoPlayCount || post.playCount || post.videoViewCount || post.viewCount || 0;
    const instagramId = post.id || post.shortCode;
    const existing = await prisma.contentItem.findFirst({ where: { instagramId, datasetId } });
    if (existing) {
        await prisma.contentItem.update({ where: { id: existing.id }, data: { views, likes: post.likesCount || 0, comments: post.commentsCount || 0, updatedAt: new Date() } });
        return 'updated';
    }
    await prisma.contentItem.create({
        data: {
            id: crypto.randomUUID(), instagramId,
            originalUrl: post.url || `https://www.instagram.com/reel/${post.shortCode}/`,
            sourceUrl: `https://instagram.com/${post.ownerUsername}`,
            coverUrl: post.displayUrl || null, videoUrl: post.videoUrl || null,
            views, likes: post.likesCount || 0, comments: post.commentsCount || 0,
            publishedAt: post.timestamp ? new Date(post.timestamp) : null,
            description: post.caption || null, viralityScore: null, contentType: 'Video',
            datasetId, isProcessed: false, isApproved: false
        }
    });
    return 'created';
}

async function addSource(username, datasetId) {
    const ex = await prisma.trackingSource.findFirst({ where: { username, datasetId } });
    if (ex) return;
    await prisma.trackingSource.create({ data: { id: crypto.randomUUID(), url: `https://www.instagram.com/${username}/`, username, isActive: true, datasetId, lastScrapedAt: new Date() } });
    console.log(`  📌 Source added: ${username}`);
}

async function processPosts(posts, username) {
    let s = { mc: 0, mu: 0, vc: 0, vu: 0 };
    for (const p of posts) {
        const v = p.videoPlayCount || p.playCount || p.videoViewCount || p.viewCount || 0;
        const r1 = await savePost(p, DATASET_MAIN); r1 === 'created' ? s.mc++ : s.mu++;
        if (v >= VIEWS_THRESHOLD) { const r2 = await savePost(p, DATASET_50K); r2 === 'created' ? s.vc++ : s.vu++; }
    }
    await addSource(username, DATASET_MAIN);
    if (s.vc > 0 || s.vu > 0) await addSource(username, DATASET_50K);
    console.log(`  📊 main: ${s.mc} new / ${s.mu} upd | 50K+: ${s.vc} new / ${s.vu} upd`);
}

(async () => {
    console.log('═══ FINAL IMPORT ═══\n');

    // 1. demin_trader — FROM CACHE
    const demin = await fetchFromCache('ArauIyAtZrLJur0Jw', 'demin_trader');
    await processPosts(demin, 'demin_trader');

    // 2. psiholog_pavlokazarian — FRESH (not in cache)
    const psiholog = await parseFresh('psiholog_pavlokazarian');
    if (psiholog.length > 0) await processPosts(psiholog, 'psiholog_pavlokazarian');

    const mc = await prisma.contentItem.count({ where: { datasetId: DATASET_MAIN } });
    const vc = await prisma.contentItem.count({ where: { datasetId: DATASET_50K } });
    console.log(`\n═══ ИТОГО: основа=${mc} | 50K+=${vc} ═══`);
    await prisma.$disconnect();
})();
