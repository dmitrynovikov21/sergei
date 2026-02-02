const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const { scrapeQueue } = require('./lib/queue');
require('dotenv').config();

const prisma = new PrismaClient();

async function triggerUpdates() {
    console.log('[Scheduler] Triggering updates for all sources...');
    try {
        const sources = await prisma.trackingSource.findMany({
            where: { isActive: true }
        });

        console.log(`[Scheduler] Found ${sources.length} active sources.`);

        for (const source of sources) {
            // Job Data
            const jobData = {
                sourceId: source.id,
                url: source.url,
                datasetId: source.datasetId,
                daysLimit: 14 // Policy
            };

            await scrapeQueue.add('scrape-source', jobData, {
                removeOnComplete: true,
                removeOnFail: 100
            });
            console.log(`[Scheduler] Queued job for ${source.username || source.url}`);
        }
    } catch (e) {
        console.error('[Scheduler] Error triggering updates:', e);
    }
}

// Schedule: Every 3 days at 00:00
// Note: In server environment, ensure this process is persistent
cron.schedule('0 0 */3 * *', () => {
    console.log('[Scheduler] Cron fired.');
    triggerUpdates();
});

console.log('[Scheduler] Service started. Schedule: 0 0 */3 * *');

module.exports = { triggerUpdates };
