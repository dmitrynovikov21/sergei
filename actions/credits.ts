"use server"

import { auth } from "@/auth"
import { CreditManager, BLOCK_THRESHOLD } from "@/lib/services/credit-manager"
import { prisma } from "@/lib/db"

export async function getBlockingStatus() {
    const session = await auth()
    if (!session?.user?.id) {
        return { error: "Unauthorized" }
    }

    const status = await CreditManager.getBlockingStatus(session.user.id)
    return {
        isBlocked: status.isBlocked,
        balance: status.balance,
        threshold: status.threshold,
        // Format for display (1000 credits = $1)
        // Display in Credits format (not USD)
        balanceFormatted: `${status.balance.toLocaleString()} CR`,
        thresholdFormatted: `${Math.abs(status.threshold).toLocaleString()} CR`
    }
}

/**
 * Check if user is eligible for free demo credits
 */
export async function checkFreeCreditsEligibility() {
    const session = await auth()
    if (!session?.user?.id) {
        return { eligible: false }
    }

    // Check if user already claimed free credits
    const existingClaim = await prisma.creditTransaction.findFirst({
        where: {
            userId: session.user.id,
            reason: 'free-test-credits'
        }
    })

    return { eligible: !existingClaim }
}
