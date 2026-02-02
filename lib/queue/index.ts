import { Queue } from 'bullmq';
import { createRedisConnection } from '../redis';

export const QUEUE_NAME = 'expert-os-tasks';

// Singleton Queue instance
let queue: Queue | null = null;

export const getQueue = () => {
    if (!queue) {
        queue = new Queue(QUEUE_NAME, {
            connection: createRedisConnection() as any,
            defaultJobOptions: {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 1000,
                },
                removeOnComplete: true, // Auto-remove completed jobs to save separate Redis memory
                removeOnFail: false,    // Keep failed jobs for inspection
            },
        });
    }
    return queue;
};

// Typed Job Data
export interface JobData {
    type: 'TEST_JOB' | 'PROCESS_DOCUMENT' | 'GENERATE_CONTENT' | 'PARSE_SOURCE';
    payload: any;
    userId?: string;
}

export const addJobToQueue = async (data: JobData) => {
    const q = getQueue();
    return q.add(data.type, data);
};
