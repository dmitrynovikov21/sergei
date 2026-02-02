"use server";

import { addJobToQueue } from "@/lib/queue";

export async function testQueueAction() {
    try {
        const job = await addJobToQueue({
            type: 'TEST_JOB',
            payload: {
                message: 'Hello from Server Action!',
                timestamp: new Date().toISOString(),
            },
            userId: 'system',
        });

        return { success: true, jobId: job.id };
    } catch (error) {
        console.error('Failed to add job:', error);
        return { success: false, error: 'Failed to add job to queue' };
    }
}
