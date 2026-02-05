/**
 * Quick script to save parsed ythemark data to DB
 */
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();
const DATASET_ID = 'eac570d9-4e1f-49ed-b302-1205d6dcf604';
const SOURCE_ID = '4f0012e2-af3d-4474-9b72-7547df3bffd8';

async function run() {
    console.log('[SaveYthemark] Fetching posts from parser...');

    const res = await fetch('http://localhost:3001/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: 'ythemark',
            contentTypes: 'Video,Sidecar,Image',
            daysLimit: 90
        })
    });

    const data = await res.json();
    console.log('[SaveYthemark] Response:', data.success, 'Posts count:', data.posts?.length || 0);

    if (!data.success || !data.posts?.length) {
        console.error('[SaveYthemark] Error:', data.error);
        return;
    }

    let saved = 0, updated = 0, skipped = 0;

    for (const post of data.posts) {
        const instagramId = post.id || post.shortCode;
        if (!instagramId) {
            skipped++;
            continue;
        }

        const existing = await prisma.contentItem.findFirst({
            where: { instagramId, datasetId: DATASET_ID }
        });

        if (existing) {
            await prisma.contentItem.update({
                where: { id: existing.id },
                data: {
                    views: post.videoPlayCount || post.playCount || 0,
                    likes: post.likesCount || 0,
                    comments: post.commentsCount || 0
                }
            });
            updated++;
        } else {
            try {
                await prisma.contentItem.create({
                    data: {
                        id: crypto.randomUUID(),
                        instagramId,
                        originalUrl: post.url || '',
                        sourceUrl: post.ownerUsername ? `https://instagram.com/${post.ownerUsername}` : null,
                        coverUrl: post.displayUrl || null,
                        videoUrl: post.videoUrl || null,
                        views: post.videoPlayCount || post.playCount || 0,
                        likes: post.likesCount || 0,
                        comments: post.commentsCount || 0,
                        publishedAt: post.timestamp ? new Date(post.timestamp) : new Date(),
                        description: post.caption || null,
                        contentType: post.type || 'Video',
                        datasetId: DATASET_ID,
                        isProcessed: false,
                        isApproved: false
                    }
                });
                saved++;
            } catch (e) {
                console.log('[SaveYthemark] Skip duplicate:', instagramId);
                skipped++;
            }
        }
    }

    // Update lastScrapedAt
    await prisma.trackingSource.update({
        where: { id: SOURCE_ID },
        data: { lastScrapedAt: new Date() }
    });

    console.log(`[SaveYthemark] Result: saved=${saved}, updated=${updated}, skipped=${skipped}`);

    const total = await prisma.contentItem.count({ where: { datasetId: DATASET_ID } });
    console.log(`[SaveYthemark] Total items in dataset: ${total}`);
}

run()
    .catch(e => console.error('[SaveYthemark] Fatal error:', e))
    .finally(() => prisma.$disconnect());
