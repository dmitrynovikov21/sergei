'use server'

import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
import { revalidatePath } from "next/cache"
import { TariffPlan, TARIFFS, calculateReferralBonus } from "@/lib/billing-config"
import { addDays, addMonths } from "date-fns"

/**
 * Purchase a subscription plan
 */
export async function purchaseSubscription(plan: TariffPlan) {
    const user = await getCurrentUser()
    if (!user) throw new Error("Unauthorized")

    const tariff = TARIFFS[plan]
    if (!tariff) throw new Error("Invalid plan")

    // Check if user already has this plan active
    const existingSub = await prisma.subscription.findFirst({
        where: {
            userId: user.id,
            plan,
            isActive: true,
            expiresAt: { gt: new Date() }
        }
    })

    if (existingSub) {
        throw new Error("Already subscribed to this plan")
    }

    const now = new Date()
    const expiresAt = addMonths(now, 1)

    // Create subscription in transaction
    const result = await prisma.$transaction(async (tx) => {
        // 1. Create subscription
        const subscription = await tx.subscription.create({
            data: {
                userId: user.id,
                plan,
                credits: tariff.credits,
                maxCredits: tariff.credits,
                priceRub: tariff.priceRub,
                startsAt: now,
                expiresAt,
                isActive: true
            }
        })

        // 2. Process referral bonus if user has referrer
        const dbUser = await tx.user.findUnique({
            where: { id: user.id },
            select: { referrerId: true, name: true }
        })

        if (dbUser?.referrerId) {
            const bonus = calculateReferralBonus(tariff.priceRub)

            // Add to referrer's balance
            await tx.user.update({
                where: { id: dbUser.referrerId },
                data: { referralBalance: { increment: bonus } }
            })

            // Log referral transaction
            await tx.referral_transactions.create({
                data: {
                    id: crypto.randomUUID(),
                    user_id: dbUser.referrerId,
                    amount: bonus,
                    type: 'REFERRAL_COMMISSION',
                    status: 'COMPLETED'
                }
            })

            console.log(`[Subscription] Referral bonus ${bonus}₽ paid to ${dbUser.referrerId}`)
        }

        return subscription
    })

    revalidatePath('/dashboard/billing')
    revalidatePath('/dashboard')

    return {
        success: true,
        subscription: result,
        message: `Подписка "${tariff.name}" активирована до ${expiresAt.toLocaleDateString('ru-RU')}`
    }
}

/**
 * Get user's active subscriptions
 */
export async function getMySubscriptions() {
    const user = await getCurrentUser()
    if (!user) throw new Error("Unauthorized")

    const now = new Date()

    const subscriptions = await prisma.subscription.findMany({
        where: {
            userId: user.id,
            isActive: true,
            expiresAt: { gt: now }
        },
        orderBy: { createdAt: 'desc' }
    })

    return subscriptions.map(sub => ({
        ...sub,
        tariff: TARIFFS[sub.plan as TariffPlan],
        creditsUsed: sub.maxCredits - sub.credits,
        creditsPercent: Math.round((sub.credits / sub.maxCredits) * 100)
    }))
}

/**
 * Get all available tariffs with user's subscription status
 */
export async function getAvailableTariffs() {
    const user = await getCurrentUser()
    if (!user) return Object.values(TARIFFS).map(t => ({ ...t, isActive: false, subscription: null }))

    const subs = await getMySubscriptions()

    return Object.values(TARIFFS).map(tariff => {
        const activeSub = subs.find(s => s.plan === tariff.plan)
        return {
            ...tariff,
            isActive: !!activeSub,
            subscription: activeSub || null
        }
    })
}

/**
 * Cancel a subscription (won't renew, but stays active until expiry)
 */
export async function cancelSubscription(subscriptionId: string) {
    const user = await getCurrentUser()
    if (!user) throw new Error("Unauthorized")

    const sub = await prisma.subscription.findUnique({
        where: { id: subscriptionId }
    })

    if (!sub || sub.userId !== user.id) {
        throw new Error("Subscription not found")
    }

    await prisma.subscription.update({
        where: { id: subscriptionId },
        data: { isActive: false }
    })

    revalidatePath('/dashboard/billing')
    return { success: true }
}

/**
 * Admin: Grant subscription to a user
 */
export async function adminGrantSubscription(userId: string, plan: TariffPlan) {
    const admin = await getCurrentUser()
    if (!admin || admin.role !== 'ADMIN') {
        throw new Error("Unauthorized")
    }

    const tariff = TARIFFS[plan]
    const now = new Date()
    const expiresAt = addMonths(now, 1)

    const subscription = await prisma.subscription.create({
        data: {
            userId,
            plan,
            credits: tariff.credits,
            maxCredits: tariff.credits,
            priceRub: 0, // Free grant
            startsAt: now,
            expiresAt,
            isActive: true
        }
    })

    return { success: true, subscription }
}

/**
 * Cron: Reset monthly credits for active subscriptions
 * Should run on 1st of each month
 */
export async function resetMonthlyCredits() {
    const now = new Date()

    // Find all active, non-expired subscriptions
    const subscriptions = await prisma.subscription.findMany({
        where: {
            isActive: true,
            expiresAt: { gt: now }
        }
    })

    let resetCount = 0

    for (const sub of subscriptions) {
        const tariff = TARIFFS[sub.plan as TariffPlan]
        if (!tariff) continue

        await prisma.subscription.update({
            where: { id: sub.id },
            data: {
                credits: tariff.credits,
                // Extend by 1 month if still active
                expiresAt: addMonths(sub.expiresAt, 1)
            }
        })
        resetCount++
    }

    console.log(`[Cron] Reset credits for ${resetCount} subscriptions`)
    return { success: true, resetCount }
}
