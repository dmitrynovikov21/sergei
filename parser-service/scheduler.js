const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const { scrapeQueue } = require('./lib/queue');
require('dotenv').config();

const prisma = new PrismaClient();

/**
 * Check if source should be parsed based on lastScrapedAt and parseFrequency
 */
function shouldParseSource(source) {
    if (!source.lastScrapedAt) return true;

    const hoursSinceLast = (Date.now() - source.lastScrapedAt.getTime()) / (1000 * 60 * 60);

    switch (source.parseFrequency) {
        case 'daily':
            return hoursSinceLast >= 24;
        case '3days':
            return hoursSinceLast >= 72;
        case 'weekly':
        default:
            return hoursSinceLast >= 168;  // 7 days
    }
}

/**
 * Trigger updates only for sources that are due
 */
async function triggerUpdates() {
    console.log('[Scheduler] Checking sources for updates...');
    try {
        const sources = await prisma.trackingSource.findMany({
            where: { isActive: true }
        });

        console.log(`[Scheduler] Found ${sources.length} active sources.`);

        let queued = 0;
        for (const source of sources) {
            // Check if source is due for parsing
            if (!shouldParseSource(source)) {
                console.log(`[Scheduler] Skipping ${source.username || source.url} - not due yet (frequency: ${source.parseFrequency})`);
                continue;
            }

            // Job Data with source-specific daysLimit
            const jobData = {
                sourceId: source.id,
                url: source.url,
                datasetId: source.datasetId,
                daysLimit: source.daysLimit || 14,
                contentTypes: source.contentTypes || 'Video,Sidecar,Image'
            };

            await scrapeQueue.add('scrape-source', jobData, {
                removeOnComplete: true,
                removeOnFail: 100
            });
            console.log(`[Scheduler] Queued job for ${source.username || source.url} (frequency: ${source.parseFrequency})`);
            queued++;
        }

        console.log(`[Scheduler] Queued ${queued}/${sources.length} sources`);
    } catch (e) {
        console.error('[Scheduler] Error triggering updates:', e);
    }
}

// Schedule: Check every hour for due sources
// Each source has its own parseFrequency (daily, 3days, weekly)
cron.schedule('0 * * * *', () => {
    console.log('[Scheduler] Hourly check fired.');
    triggerUpdates();
});

console.log('[Scheduler] Service started. Checking hourly for due sources.');

module.exports = { triggerUpdates, shouldParseSource };
