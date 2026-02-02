/**
 * Subscription Guard
 * Checks user access to premium agents based on subscriptions
 */

import { prisma } from "@/lib/db"
import { getRequiredPlanForAgent, TariffPlan, TARIFFS } from "./billing-config"

export interface ActiveSubscription {
    id: string
    plan: TariffPlan
    credits: number
    maxCredits: number
    expiresAt: Date
}

/**
 * Get all active subscriptions for a user
 */
export async function getActiveSubscriptions(userId: string): Promise<ActiveSubscription[]> {
    const now = new Date()

    const subs = await prisma.subscription.findMany({
        where: {
            userId,
            isActive: true,
            expiresAt: { gt: now }
        },
        select: {
            id: true,
            plan: true,
            credits: true,
            maxCredits: true,
            expiresAt: true
        }
    })

    return subs as ActiveSubscription[]
}

/**
 * Check if user has access to a specific agent
 * Returns: { hasAccess: boolean, requiredPlan?: TariffPlan, subscription?: ActiveSubscription }
 */
export async function checkAgentAccess(userId: string, agentName: string): Promise<{
    hasAccess: boolean
    requiredPlan: TariffPlan | null
    subscription: ActiveSubscription | null
    error?: string
}> {
    const requiredPlan = getRequiredPlanForAgent(agentName)

    // Agent doesn't require subscription (custom agent or free)
    if (!requiredPlan) {
        return { hasAccess: true, requiredPlan: null, subscription: null }
    }

    const subscriptions = await getActiveSubscriptions(userId)
    const matchingSub = subscriptions.find(s => s.plan === requiredPlan)

    if (!matchingSub) {
        return {
            hasAccess: false,
            requiredPlan,
            subscription: null,
            error: `SUBSCRIPTION_REQUIRED:${requiredPlan}`
        }
    }

    // Check if subscription has credits left
    if (matchingSub.credits <= 0) {
        return {
            hasAccess: false,
            requiredPlan,
            subscription: matchingSub,
            error: 'CREDITS_EXHAUSTED'
        }
    }

    return { hasAccess: true, requiredPlan, subscription: matchingSub }
}

/**
 * Deduct credits from a subscription
 */
export async function deductSubscriptionCredits(subscriptionId: string, amount: number): Promise<boolean> {
    try {
        await prisma.subscription.update({
            where: { id: subscriptionId },
            data: {
                credits: { decrement: amount }
            }
        })
        return true
    } catch (error) {
        console.error('[SubscriptionGuard] Failed to deduct credits:', error)
        return false
    }
}

/**
 * Get total remaining credits across all active subscriptions
 */
export async function getTotalCredits(userId: string): Promise<number> {
    const subs = await getActiveSubscriptions(userId)
    return subs.reduce((sum, sub) => sum + sub.credits, 0)
}

/**
 * Get total credit limit across all active subscriptions
 */
export async function getTotalCreditLimit(userId: string): Promise<number> {
    const subs = await getActiveSubscriptions(userId)
    return subs.reduce((sum, sub) => sum + sub.maxCredits, 0)
}

/**
 * Find best subscription to charge for a request
 * Prefers subscription with most credits remaining
 */
export async function findSubscriptionToCharge(userId: string, agentName: string): Promise<ActiveSubscription | null> {
    const requiredPlan = getRequiredPlanForAgent(agentName)

    if (!requiredPlan) {
        // For non-premium agents, find any subscription with credits
        const subs = await getActiveSubscriptions(userId)
        return subs.sort((a, b) => b.credits - a.credits)[0] || null
    }

    const subs = await getActiveSubscriptions(userId)
    const matchingSubs = subs.filter(s => s.plan === requiredPlan)

    return matchingSubs.sort((a, b) => b.credits - a.credits)[0] || null
}
