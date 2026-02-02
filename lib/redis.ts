import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const getRedisConnection = () => {
    const connection = new Redis(redisUrl, {
        maxRetriesPerRequest: null, // Required by BullMQ
    });

    connection.on('error', (err) => {
        console.error('Redis connection error:', err);
    });

    return connection;
};

// Singleton instance for general use if needed, 
// but BullMQ usually takes connection options or a reusable connection.
// For simple key-value operations:
export const redis = getRedisConnection();

// For BullMQ, we often create separate connections for blocking/non-blocking
export const createRedisConnection = () => getRedisConnection();
