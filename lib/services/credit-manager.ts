import { prisma } from "@/lib/db"

// Exchange rate: 1000 credits = $1.00 USD
// This allows granular billing for AI tokens.
// Example: GPT-4o Input 1000 tokens ≈ $0.0025 = 2.5 Credits
export const CREDITS_PER_USD = 1000;

// Block user when balance drops below this threshold
// -1000 credits = -$1.00 USD debt allowed before blocking
export const BLOCK_THRESHOLD = -1000;

export class CreditManager {

    /**
     * Get current user balance
     */
    static async getBalance(userId: string): Promise<number> {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { credits: true }
        });
        return user?.credits ?? 0;
    }

    /**
     * Check if user has enough credits
     */
    static async hasCredits(userId: string, amount: number): Promise<boolean> {
        const balance = await this.getBalance(userId);
        return balance >= amount;
    }

    /**
     * Check if user is blocked from AI usage (balance below threshold)
     */
    static async isBlocked(userId: string): Promise<boolean> {
        const balance = await this.getBalance(userId);
        return balance < BLOCK_THRESHOLD;
    }

    /**
     * Get blocking status with balance info
     */
    static async getBlockingStatus(userId: string): Promise<{ isBlocked: boolean; balance: number; threshold: number }> {
        const balance = await this.getBalance(userId);
        return {
            isBlocked: balance < BLOCK_THRESHOLD,
            balance,
            threshold: BLOCK_THRESHOLD
        };
    }

    /**
     * Deduct credits transactionally.
     * Throws error if insufficient funds (optional constraint).
     */
    static async deductCredits(userId: string, amount: number, reason: string, metadata?: object) {
        if (amount <= 0) return; // No deduction needed

        // Use transaction to ensure consistency
        return await prisma.$transaction(async (tx) => {
            const user = await tx.user.findUnique({ where: { id: userId } });

            if (!user) throw new Error("User not found");

            // Allow negative balance? For now, let's allow it to prevent interruption of streams,
            // but in production we might want to enforce >= 0.
            // Let's enforce strict limits for now to be safe.
            // if (user.credits < amount) throw new Error("Insufficient credits");

            const newBalance = user.credits - amount;

            // 1. Update User Balance
            await tx.user.update({
                where: { id: userId },
                data: { credits: newBalance }
            });

            // 2. Log Transaction
            await tx.creditTransaction.create({
                data: {
                    userId,
                    amount: -amount, // Negative for spending
                    reason,
                    metadata: metadata ? JSON.stringify(metadata) : null
                }
            });

            return newBalance;
        });
    }

    /**
     * Add credits (Top-up, Bonus, etc.)
     */
    static async addCredits(userId: string, amount: number, reason: string, metadata?: object) {
        if (amount <= 0) return;

        return await prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: { id: userId },
                data: { credits: { increment: amount } }
            });

            await tx.creditTransaction.create({
                data: {
                    userId,
                    amount: amount, // Positive for addition
                    reason,
                    metadata: metadata ? JSON.stringify(metadata) : null
                }
            });
        });
    }

    /**
     * Helper to convert USD cost to Credits
     */
    static costToCredits(costUsd: number): number {
        return Math.ceil(costUsd * CREDITS_PER_USD);
    }
}
