/**
 * Batch Import: Parse Instagram profiles and save to datasets
 * 
 * Usage: node scripts/batch-import.js
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

const PARSER_URL = 'http://localhost:3001';
const DATASET_50K = '1ac12945-7926-4409-a36a-6b1b6d35dcb6';   // Вирусы 50K+
const DATASET_MAIN = '26cd2b59-7ae0-426d-86fb-4abbb15ef846';   // основа пошла рилсы
const VIEWS_THRESHOLD = 50000;
const DAYS_LIMIT = 90;

const PROFILES = [
    'natalia_rubtsovskaya',
    'demin_trader',
    'psiholog_pavlokazarian',
];

async function parseProfile(username) {
    console.log(`\n🔍 Parsing ${username}...`);
    const res = await fetch(`${PARSER_URL}/api/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username,
            limit: 100,
            daysLimit: DAYS_LIMIT,
            contentTypes: 'Video'
        }),
        signal: AbortSignal.timeout(15 * 60 * 1000), // 15 min
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

    // Check duplicate
    const existing = await prisma.contentItem.findFirst({
        where: { instagramId, datasetId }
    });

    if (existing) {
        await prisma.contentItem.update({
            where: { id: existing.id },
            data: {
                views,
                likes: post.likesCount || 0,
                comments: post.commentsCount || 0,
                updatedAt: new Date()
            }
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
            views,
            likes: post.likesCount || 0,
            comments: post.commentsCount || 0,
            publishedAt: post.timestamp ? new Date(post.timestamp) : null,
            description: post.caption || null,
            viralityScore: null,
            contentType: 'Video',
            datasetId,
            isProcessed: false,
            isApproved: false
        }
    });
    return 'created';
}

async function addTrackingSource(username, datasetId) {
    const existing = await prisma.trackingSource.findFirst({
        where: { username, datasetId }
    });
    if (existing) return;

    await prisma.trackingSource.create({
        data: {
            id: crypto.randomUUID(),
            url: `https://www.instagram.com/${username}/`,
            username,
            isActive: true,
            datasetId,
            lastScrapedAt: new Date()
        }
    });
    console.log(`  📌 Tracking source added: ${username} → dataset`);
}

async function main() {
    console.log('═══════════════════════════════════════');
    console.log('  BATCH IMPORT — 4 profiles');
    console.log('═══════════════════════════════════════');

    for (const username of PROFILES) {
        const posts = await parseProfile(username);
        if (posts.length === 0) continue;

        let stats = { '50k_created': 0, '50k_updated': 0, 'main_created': 0, 'main_updated': 0 };

        for (const post of posts) {
            const views = post.videoPlayCount || post.playCount || post.videoViewCount || post.viewCount || 0;

            // ALL posts go to main dataset
            const mainResult = await savePost(post, DATASET_MAIN);
            stats[`main_${mainResult}`]++;

            // 50K+ also go to 50K dataset
            if (views >= VIEWS_THRESHOLD) {
                const result50k = await savePost(post, DATASET_50K);
                stats[`50k_${result50k}`]++;
            }
        }

        // Add tracking sources
        await addTrackingSource(username, DATASET_MAIN);
        // Only add to 50K if there were 50K+ posts
        if (stats['50k_created'] > 0 || stats['50k_updated'] > 0) {
            await addTrackingSource(username, DATASET_50K);
        }

        console.log(`  📊 ${username} results:`);
        console.log(`     основа пошла: ${stats.main_created} new, ${stats.main_updated} updated`);
        console.log(`     50K+: ${stats['50k_created']} new, ${stats['50k_updated']} updated`);
    }

    // Final counts
    const main = await prisma.contentItem.count({ where: { datasetId: DATASET_MAIN } });
    const viral = await prisma.contentItem.count({ where: { datasetId: DATASET_50K } });
    console.log(`\n═══════════════════════════════════════`);
    console.log(`  ИТОГО: основа пошла = ${main} | 50K+ = ${viral}`);
    console.log('═══════════════════════════════════════');

    await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
