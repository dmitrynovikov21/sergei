'use server'

import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
import { revalidatePath } from "next/cache"
import { sendPayoutApprovedEmail } from "@/lib/email"

// Check if current user is logged in
async function requireAdmin() {
    const user = await getCurrentUser()
    if (!user) {
        throw new Error('Unauthorized: Please login')
    }
    return user
}

export async function getPayoutRequests() {
    await requireAdmin()

    const requests = await prisma.payout_requests.findMany({
        orderBy: { created_at: 'desc' },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    referralBalance: true
                }
            }
        }
    })

    return requests
}

export async function approvePayoutRequest(requestId: string) {
    await requireAdmin()

    const request = await prisma.payout_requests.findUnique({
        where: { id: requestId },
        include: {
            user: {
                select: { id: true, email: true, name: true }
            }
        }
    })

    if (!request) {
        throw new Error('Payout request not found')
    }

    if (request.status !== 'PENDING') {
        throw new Error('Request already processed')
    }

    await prisma.$transaction([
        // Update request status
        prisma.payout_requests.update({
            where: { id: requestId },
            data: {
                status: 'APPROVED'
            }
        }),
        // Create transaction record
        prisma.referral_transactions.create({
            data: {
                id: crypto.randomUUID(),
                user_id: request.user_id,
                amount: -request.amount,
                type: 'PAYOUT_APPROVED',
                status: 'COMPLETED'
            }
        })
    ])

    // Send email notification
    if (request.user?.email) {
        try {
            await sendPayoutApprovedEmail({
                to: request.user.email,
                name: request.user.name || 'Пользователь',
                amount: request.amount
            })
        } catch (e) {
            console.error('[Admin] Failed to send payout email:', e)
        }
    }

    revalidatePath('/dashboard/admin/payouts')
    return { success: true }
}

export async function rejectPayoutRequest(requestId: string, reason?: string) {
    await requireAdmin()

    const request = await prisma.payout_requests.findUnique({
        where: { id: requestId }
    })

    if (!request) {
        throw new Error('Payout request not found')
    }

    if (request.status !== 'PENDING') {
        throw new Error('Request already processed')
    }

    await prisma.$transaction([
        // Update request status
        prisma.payout_requests.update({
            where: { id: requestId },
            data: {
                status: 'REJECTED'
            }
        }),
        // Return funds to balance
        prisma.user.update({
            where: { id: request.user_id },
            data: { referralBalance: { increment: request.amount } }
        }),
        // Create transaction record
        prisma.referral_transactions.create({
            data: {
                id: crypto.randomUUID(),
                user_id: request.user_id,
                amount: request.amount,
                type: 'PAYOUT_REJECTED',
                status: 'COMPLETED'
            }
        })
    ])

    revalidatePath('/dashboard/admin/payouts')
    return { success: true }
}

// Admin: manually adjust user balance
export async function adjustUserBalance(userId: string, amount: number, reason: string) {
    await requireAdmin()

    await prisma.$transaction([
        prisma.user.update({
            where: { id: userId },
            data: { referralBalance: { increment: amount } }
        }),
        prisma.referral_transactions.create({
            data: {
                id: crypto.randomUUID(),
                user_id: userId,
                amount,
                type: 'ADMIN_ADJUSTMENT',
                status: 'COMPLETED'
            }
        })
    ])

    revalidatePath('/dashboard/admin/payouts')
    return { success: true }
}
