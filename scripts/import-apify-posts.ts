/**
 * Import Apify posts from JSON file to database
 */
import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

const DATASET_ID = '26cd2b59-7ae0-426d-86fb-4abbb15ef846';
const SOURCE_ID = 'd6193861-1f3b-45d2-a1de-b117b0e56713';

// 2 days ago cutoff
const cutoffDate = new Date();
cutoffDate.setDate(cutoffDate.getDate() - 2);

async function importPosts() {
    console.log('Reading posts from /tmp/apify_posts.json...');
    const rawData = fs.readFileSync('/tmp/apify_posts.json', 'utf-8');
    const posts = JSON.parse(rawData);

    console.log(`Found ${posts.length} total posts`);

    let saved = 0;
    let skipped = 0;
    let updated = 0;

    for (const post of posts) {
        try {
            const publishedAt = new Date(post.timestamp);

            // Skip if older than 2 days
            if (publishedAt < cutoffDate) {
                skipped++;
                continue;
            }

            // Skip non-video
            if (post.type !== 'Video') {
                skipped++;
                continue;
            }

            const instagramId = post.id || post.shortCode;
            const views = post.videoPlayCount || post.playCount || post.videoViewCount || 0;

            // Check if exists
            const existing = await prisma.contentItem.findFirst({
                where: { instagramId, datasetId: DATASET_ID }
            });

            if (existing) {
                // Update stats
                await prisma.contentItem.update({
                    where: { id: existing.id },
                    data: {
                        views,
                        likes: post.likesCount,
                        comments: post.commentsCount,
                        updatedAt: new Date()
                    }
                });
                updated++;
            } else {
                // Create new
                await prisma.contentItem.create({
                    data: {
                        id: crypto.randomUUID(),
                        instagramId,
                        originalUrl: post.url,
                        sourceUrl: `https://instagram.com/${post.ownerUsername}`,
                        coverUrl: post.displayUrl,
                        videoUrl: post.videoUrl,
                        views,
                        likes: post.likesCount || 0,
                        comments: post.commentsCount || 0,
                        publishedAt,
                        description: post.caption,
                        contentType: post.type,
                        datasetId: DATASET_ID,
                        isProcessed: false,
                        isApproved: false
                    }
                });
                saved++;
            }
        } catch (error) {
            console.error(`Error on post ${post.id}:`, error);
        }
    }

    // Update source lastScrapedAt
    await prisma.trackingSource.update({
        where: { id: SOURCE_ID },
        data: { lastScrapedAt: new Date() }
    });

    console.log(`\n=== IMPORT COMPLETE ===`);
    console.log(`Saved: ${saved}`);
    console.log(`Updated: ${updated}`);
    console.log(`Skipped: ${skipped}`);

    await prisma.$disconnect();
}

importPosts().catch(console.error);
