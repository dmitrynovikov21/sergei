const { Queue } = require('bullmq');
const IORedis = require('ioredis');

// Ensure Redis URL is set
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

console.log(`[Queue] Connecting to Redis: ${redisUrl}`);

const connection = new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
});

const QUEUE_NAME = 'scrape-source';

const scrapeQueue = new Queue(QUEUE_NAME, { connection });

module.exports = { scrapeQueue, connection, QUEUE_NAME };
