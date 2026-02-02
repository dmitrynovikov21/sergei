"use server";

import { addJobToQueue } from "@/lib/queue";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";

export async function triggerAiJob() {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    try {
        const job = await addJobToQueue({
            type: 'PROCESS_DOCUMENT',
            payload: {
                documentId: 'mock-doc-123',
                content: 'This is a test document for billing verification.',
                model: 'mock-gpt'
            },
            userId: session.user.id,
        });
        return { success: true, jobId: job.id };
    } catch (error) {
        console.error('Failed to trigger AI job:', error);
        return { success: false, error: 'Failed to add job' };
    }
}

export async function getRecentTransactions() {
    const session = await auth();
    if (!session?.user) return [];

    return await (prisma as any).tokenTransaction.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
    });
}
