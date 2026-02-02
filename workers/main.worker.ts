import { Worker, Job } from 'bullmq';
import { createRedisConnection } from '../lib/redis';
import { QUEUE_NAME, JobData } from '../lib/queue/index';
import { processTrackingSource } from '../lib/parser/harvester';
import { AiGateway } from '../lib/services/ai-gateway';

console.log('👷 Worker started. Listening for jobs...');

const worker = new Worker<JobData>(
    QUEUE_NAME,
    async (job: Job<JobData>) => {
        console.log(`[Job ${job.id}] Processing ${job.name || job.data.type}...`);

        try {
            switch (job.data.type) {
                case 'TEST_JOB':
                    await handleTestJob(job);
                    break;
                case 'PROCESS_DOCUMENT':
                    await handleProcessDocument(job);
                    break;
                case 'PARSE_SOURCE':
                    await handleParseSource(job);
                    break;
                default:
                    console.warn(`Unknown job type: ${job.data.type}`);
            }

            console.log(`[Job ${job.id}] Completed successfully.`);
        } catch (error) {
            console.error(`[Job ${job.id}] Failed:`, error);
            throw error;
        }
    },
    {
        connection: createRedisConnection() as any,
        concurrency: 5, // Process 5 jobs in parallel
    }
);

worker.on('failed', (job, err) => {
    console.error(`[Job ${job?.id}] Failed permanently with ${err.message}`);
});

// Handlers
async function handleTestJob(job: Job<JobData>) {
    console.log('Test job payload:', job.data.payload);
    // Simulate heavy work
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { processed: true };
}

async function handleProcessDocument(job: Job<JobData>) {
    console.log(`[Job ${job.id}] Processing document...`);
    const { userId } = job.data;

    // Example: Call AI via Gateway
    const result = await AiGateway.generateCompletion({
        model: job.data.payload.model || 'gpt-4o',
        userId: userId || 'system', // ensuring attribution
        messages: [
            { role: 'system', content: 'You are a document analyzer.' },
            { role: 'user', content: 'Analyze this document.' }
        ],
        context: { jobId: job.id, type: 'document_analysis' }
    });

    console.log(`[Job ${job.id}] AI Result:`, result.text.substring(0, 50) + '...');
    return result;
}

async function handleParseSource(job: Job<JobData>) {
    const { sourceId } = job.data.payload;
    console.log(`[Job ${job.id}] Parsing source ${sourceId}...`);

    // Call the harvester directly
    const result = await processTrackingSource(sourceId);

    console.log(`[Job ${job.id}] Parse result: Found ${result.fetched}, Saved ${result.saved}, Skipped ${result.skipped}`);
    return result;
}

