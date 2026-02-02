'use server'

import { cookies } from "next/headers"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
import { revalidatePath } from "next/cache"

export async function setReferralCookie(code: string) {
    const cookieStore = cookies()
    if (!code) return
    cookieStore.set("referral_code", code, {
        path: "/",
        maxAge: 60 * 60 * 24 * 30, // 30 days
        httpOnly: true,
        sameSite: "lax"
    })
}

export async function getReferralStats() {
    const user = await getCurrentUser()
    if (!user) {
        throw new Error("Unauthorized")
    }

    let dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: {
            referralCode: true,
            referralBalance: true,
            _count: {
                select: { referrals: true }
            },
            referralTransactions: {
                orderBy: { createdAt: 'desc' },
                take: 50
            },
            payoutRequests: {
                orderBy: { createdAt: 'desc' },
                take: 10
            }
        }
    })

    if (!dbUser) throw new Error("User not found")

    // Generate code if missing
    if (!dbUser.referralCode) {
        const { nanoid } = await import("nanoid")
        const newCode = nanoid(6)
        await prisma.user.update({
            where: { id: user.id },
            data: { referralCode: newCode }
        })
        dbUser.referralCode = newCode
    }

    return {
        referralCode: dbUser.referralCode,
        balance: dbUser.referralBalance,
        referralsCount: dbUser._count.referrals,
        transactions: dbUser.referralTransactions,
        payouts: dbUser.payoutRequests
    }
}

export async function requestPayout(amount: number, details: string) {
    const user = await getCurrentUser()
    if (!user) throw new Error("Unauthorized")

    if (amount < 1000) throw new Error("Minimum withdrawal amount is 1,000 RUB")

    const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { referralBalance: true }
    })

    if (!dbUser || dbUser.referralBalance < amount) {
        throw new Error("Insufficient referral balance")
    }

    await prisma.payoutRequest.create({
        data: {
            userId: user.id,
            amount: amount,
            status: "PENDING",
            details: details
        }
    })

    // Hold funds
    await prisma.$transaction([
        prisma.user.update({
            where: { id: user.id },
            data: { referralBalance: { decrement: amount } }
        }),
        prisma.referralTransaction.create({
            data: {
                userId: user.id,
                amount: -amount,
                type: "WITHDRAWAL_HOLD",
                status: "PENDING"
            }
        })
    ])

    revalidatePath('/referrals')
    return { success: true }
}

export async function paySubscriptionFromReferralBalance() {
    const PRICE_RUB = 2000
    const CREDITS_AMOUNT = 20000

    const user = await getCurrentUser()
    if (!user) throw new Error("Unauthorized")

    const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { referralBalance: true }
    })

    if (!dbUser || dbUser.referralBalance < PRICE_RUB) {
        throw new Error(`Insufficient funds. Need ${PRICE_RUB} RUB`)
    }

    await prisma.$transaction(async (tx) => {
        await tx.user.update({
            where: { id: user.id },
            data: { referralBalance: { decrement: PRICE_RUB } }
        })

        await tx.referralTransaction.create({
            data: {
                userId: user.id,
                amount: -PRICE_RUB,
                type: "SPEND_INTERNAL",
                status: "COMPLETED"
            }
        })

        await tx.user.update({
            where: { id: user.id },
            data: { credits: { increment: CREDITS_AMOUNT } }
        })

        await tx.creditTransaction.create({
            data: {
                userId: user.id,
                amount: CREDITS_AMOUNT,
                reason: "referral-exchange",
                metadata: JSON.stringify({ costRUB: PRICE_RUB })
            }
        })
    })

    revalidatePath('/referrals')
    revalidatePath('/dashboard/billing')
    return { success: true, creditsAdded: CREDITS_AMOUNT }
}
