"use server"

import { auth } from "@/auth"
import { CreditManager, BLOCK_THRESHOLD } from "@/lib/services/credit-manager"

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
        balanceFormatted: `${(status.balance / 1000).toFixed(2)} $`,
        thresholdFormatted: `${(status.threshold / 1000).toFixed(2)} $`
    }
}
