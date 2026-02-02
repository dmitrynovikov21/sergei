import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'

// TEST: Free 100 credits (one-time per user)
const FREE_CREDITS = 100

export async function POST(req: NextRequest) {
    try {
        const user = await getCurrentUser()
        if (!user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Check if user already claimed free credits
        const existingClaim = await prisma.creditTransaction.findFirst({
            where: {
                userId: user.id,
                reason: 'free-test-credits'
            }
        })

        if (existingClaim) {
            return NextResponse.json({ error: 'Уже получены тестовые кредиты' }, { status: 400 })
        }

        // Add credits
        await prisma.$transaction([
            prisma.user.update({
                where: { id: user.id },
                data: { credits: { increment: FREE_CREDITS } }
            }),
            prisma.creditTransaction.create({
                data: {
                    userId: user.id,
                    amount: FREE_CREDITS,
                    reason: 'free-test-credits',
                    metadata: JSON.stringify({ note: 'Free test credits' })
                }
            })
        ])

        // Also credit referrer if exists
        const userWithReferrer = await prisma.user.findUnique({
            where: { id: user.id },
            select: { referrerId: true }
        })

        if (userWithReferrer?.referrerId) {
            const commission = 0.30 // 30% of 1 RUB (symbolic)
            await prisma.$transaction([
                prisma.user.update({
                    where: { id: userWithReferrer.referrerId },
                    data: { referralBalance: { increment: commission } }
                }),
                prisma.referralTransaction.create({
                    data: {
                        userId: userWithReferrer.referrerId,
                        amount: commission,
                        type: 'COMMISSION',
                        status: 'COMPLETED',
                        sourceUserId: user.id
                    }
                })
            ])
        }

        console.log(`[Free Credits] User ${user.id} claimed ${FREE_CREDITS} free credits`)

        return NextResponse.json({
            success: true,
            credits: FREE_CREDITS,
            message: 'Тестовые кредиты получены!'
        })

    } catch (error) {
        console.error('[Free Credits] Error:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed' },
            { status: 500 }
        )
    }
}
