import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getPayment } from '@/lib/yookassa'
import { sendReferralCommissionEmail } from '@/lib/mail'

const REFERRAL_COMMISSION_RATE = 0.30 // 30% for credit purchases
const SUBSCRIPTION_COMMISSION_RATE = 0.10 // 10% for subscriptions

interface YooKassaWebhookEvent {
    type: 'notification'
    event: 'payment.succeeded' | 'payment.waiting_for_capture' | 'payment.canceled' | 'refund.succeeded'
    object: {
        id: string
        status: string
        amount: {
            value: string
            currency: string
        }
        metadata?: {
            user_id?: string
            package_id?: string
            credits?: string
            type?: 'subscription' | 'credits'
            plan?: 'reels' | 'carousels'
            price_rub?: string
        }
    }
}

export async function POST(req: NextRequest) {
    try {
        const body: YooKassaWebhookEvent = await req.json()

        console.log('[YooKassa Webhook] Event:', body.event, 'Payment:', body.object.id)

        // Only process successful payments
        if (body.event !== 'payment.succeeded') {
            return NextResponse.json({ received: true })
        }

        const payment = body.object
        const userId = payment.metadata?.user_id
        const amountRub = parseFloat(payment.amount.value)
        const isSubscription = payment.metadata?.type === 'subscription'

        if (!userId) {
            console.error('[YooKassa Webhook] No user_id in metadata')
            return NextResponse.json({ error: 'No user_id' }, { status: 400 })
        }

        // Verify payment via API (security check)
        const verifiedPayment = await getPayment(payment.id)
        if (verifiedPayment.status !== 'succeeded') {
            console.error('[YooKassa Webhook] Payment not verified:', verifiedPayment.status)
            return NextResponse.json({ error: 'Payment not verified' }, { status: 400 })
        }

        // Find user and their referrer
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true,
                referrerId: true
            }
        })

        if (!user) {
            console.error('[YooKassa Webhook] User not found:', userId)
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        // ===== SUBSCRIPTION HANDLING =====
        if (isSubscription) {
            const plan = payment.metadata?.plan as 'reels' | 'carousels'
            const credits = parseInt(payment.metadata?.credits || '0', 10)

            if (!plan) {
                return NextResponse.json({ error: 'No plan in metadata' }, { status: 400 })
            }

            const now = new Date()
            const expiresAt = new Date(now)
            expiresAt.setMonth(expiresAt.getMonth() + 1)

            await prisma.$transaction(async (tx) => {
                // 1. Create subscription
                await tx.subscription.create({
                    data: {
                        id: crypto.randomUUID(),
                        userId: userId,
                        plan,
                        credits,
                        maxCredits: credits,
                        priceRub: amountRub,
                        startsAt: now,
                        expiresAt,
                        isActive: true
                    }
                })

                // 2. Referral commission (10% for subscriptions)
                if (user.referrerId) {
                    const commission = amountRub * SUBSCRIPTION_COMMISSION_RATE

                    await tx.user.update({
                        where: { id: user.referrerId },
                        data: { referralBalance: { increment: commission } }
                    })

                    await tx.referral_transactions.create({
                        data: {
                            id: crypto.randomUUID(),
                            user_id: user.referrerId,
                            amount: commission,
                            type: 'REFERRAL_COMMISSION',
                            status: 'COMPLETED'
                        }
                    })

                    console.log(`[YooKassa Webhook] Referral commission ${commission}₽ to ${user.referrerId}`)
                }
            })

            console.log(`[YooKassa Webhook] Subscription ${plan} created for ${userId}`)
            return NextResponse.json({ received: true, subscription: plan, userId })
        }

        // ===== CREDIT PACKAGE HANDLING =====
        const credits = parseInt(payment.metadata?.credits || '0', 10)

        await prisma.$transaction(async (tx) => {
            // 1. Add credits to user
            await tx.user.update({
                where: { id: userId },
                data: { credits: { increment: credits } }
            })

            // 2. Log credit transaction
            await tx.creditTransaction.create({
                data: {
                    id: crypto.randomUUID(),
                    userId: userId,
                    amount: credits,
                    reason: 'purchase',
                    metadata: JSON.stringify({
                        paymentId: payment.id,
                        amountRub,
                        packageId: payment.metadata?.package_id
                    })
                }
            })

            // 3. Referral commission (30% for credits)
            if (user.referrerId) {
                const commission = amountRub * REFERRAL_COMMISSION_RATE

                await tx.user.update({
                    where: { id: user.referrerId },
                    data: { referralBalance: { increment: commission } }
                })

                await tx.referral_transactions.create({
                    data: {
                        id: crypto.randomUUID(),
                        user_id: user.referrerId,
                        amount: commission,
                        type: 'REFERRAL_COMMISSION',
                        status: 'COMPLETED'
                    }
                })

                console.log(`[YooKassa Webhook] Credited ${commission}₽ to referrer ${user.referrerId}`)

                // Send email notification
                const referrer = await tx.user.findUnique({
                    where: { id: user.referrerId },
                    select: { email: true, name: true }
                })

                if (referrer?.email) {
                    try {
                        await sendReferralCommissionEmail({
                            to: referrer.email,
                            referrerName: referrer.name || 'Партнёр',
                            amount: commission,
                            referralName: user.name || user.email || 'Пользователь'
                        })
                    } catch (emailError) {
                        console.error('[YooKassa Webhook] Email error:', emailError)
                    }
                }
            }
        })

        console.log(`[YooKassa Webhook] Success: +${credits} credits for user ${userId}`)
        return NextResponse.json({ received: true, credits, userId })

    } catch (error) {
        console.error('[YooKassa Webhook] Error:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Webhook failed' },
            { status: 500 }
        )
    }
}
