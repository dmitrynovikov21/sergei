const { Worker } = require('bullmq');
const { PrismaClient } = require('@prisma/client');
const { scrapeInstagram } = require('./apify');
const { connection, QUEUE_NAME } = require('./queue');

const prisma = new PrismaClient();

console.log(`[Worker] Initializing worker for queue: ${QUEUE_NAME}...`);

const worker = new Worker(QUEUE_NAME, async (job) => {
    const { sourceId, url, datasetId, daysLimit = 14 } = job.data;
    console.log(`[Worker] Processing job ${job.id} for source ${sourceId} (${url})`);

    try {
        // 1. Load source configuration
        const source = await prisma.trackingSource.findUnique({
            where: { id: sourceId },
            select: {
                contentTypes: true,
                daysLimit: true
            }
        });

        if (!source) {
            throw new Error(`Source ${sourceId} not found`);
        }

        console.log(`[Worker] Content Types: ${source.contentTypes || "All"}`);
        console.log(`[Worker] Days Limit: ${source.daysLimit}`);

        // 2. Scrape Data (use daysLimit from DB, not job.data)
        const items = await scrapeInstagram(url, 1000, source.daysLimit, {}, source.contentTypes);
        console.log(`[Worker] Scraped ${items.length} items for ${url}`);

        // 3. Filter & Upsert (filtering already done in apify.js based on contentTypes)
        // We calculate date threshold
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 30); // Keep 30 days history just in case, logic asks for 14 but broader is safe

        let newCount = 0;
        let updatedCount = 0;

        // Process in transaction or batch? Batch is better for perf, but upsert needs loop in Prisma
        // We will loop.
        for (const item of items) {
            const takenAt = new Date(item.timestamp || item.date || item.takenAt);
            if (!takenAt || isNaN(takenAt.getTime())) continue;

            const instagramId = item.id;
            if (!instagramId) continue;

            // Upsert
            const data = {
                instagramId: instagramId,
                originalUrl: item.url || item.shortCode ? `https://www.instagram.com/p/${item.shortCode}/` : '',
                sourceUrl: url,
                coverUrl: item.displayUrl || item.thumbnailUrl,
                videoUrl: item.videoUrl,
                views: item.videoViewCount || 0,
                likes: item.likesCount || 0,
                comments: item.commentsCount || 0,
                publishedAt: takenAt,
                headline: item.caption,
                datasetId: datasetId,
                // processingError: null,
                // isProcessed: false // Don't reset if already processed? 
            };

            // Needs explicit create/update for Prisma upsert
            const where = {
                instagramId_datasetId: {
                    instagramId: instagramId,
                    datasetId: datasetId
                }
            };

            // If exists, we mainly update stats. We avoid resetting 'isProcessed' / 'isApproved'
            const update = {
                views: data.views,
                likes: data.likes,
                comments: data.comments,
                updatedAt: new Date(),
                // Update basic data too if changed?
                coverUrl: data.coverUrl,
                videoUrl: data.videoUrl
            };

            const create = {
                ...data,
                isProcessed: false,
                isApproved: false
            };

            const res = await prisma.contentItem.upsert({
                where,
                create,
                update
            });

            // Count naive (upsert always returns object)
            // We can't easily know if inserted or updated without checking createdAt vs updatedAt difference, 
            // but effectively we just updated stats.
        }

        console.log(`[Worker] Upserted ${items.length} items.`);

        // 3. Update TrackingSource
        await prisma.trackingSource.update({
            where: { id: sourceId },
            data: {
                lastScrapedAt: new Date(),
                // maybe update error status to null? 
            }
        });

        return { itemsCount: items.length };

    } catch (error) {
        console.error(`[Worker] Job failed for ${sourceId}:`, error);

        // Log failure in tracking source? 
        // We don't have error field in TrackingSource (only in ParseHistory which is old model)
        // But we can log to console.
        throw error;
    }

}, { connection, concurrency: 2 }); // Low concurrency to be safe with proxies

worker.on('completed', (job, result) => {
    console.log(`[Worker] Job ${job.id} completed! Scraped: ${result.itemsCount}`);
});

worker.on('failed', (job, err) => {
    console.log(`[Worker] Job ${job.id} failed: ${err.message}`);
});

module.exports = { worker };
