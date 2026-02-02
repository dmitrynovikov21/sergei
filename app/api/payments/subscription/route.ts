/**
 * Subscription Payment API
 * Creates YooKassa payment for subscription purchase
 */

import { NextRequest, NextResponse } from 'next/server'
import { createPayment } from '@/lib/yookassa'
import { getCurrentUser } from '@/lib/session'
import { TariffPlan, TARIFFS } from '@/lib/billing-config'
import { getDynamicTariffs } from '@/actions/tariffs'

export async function POST(req: NextRequest) {
    try {
        const user = await getCurrentUser()
        if (!user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { plan } = body as { plan: TariffPlan }

        // Get dynamic tariff from database
        const tariffs = await getDynamicTariffs()
        const tariff = tariffs[plan]

        if (!tariff) {
            return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
        }

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

        const payment = await createPayment({
            amount: tariff.priceRub,
            userId: user.id,
            description: `Подписка "${tariff.name}" - AI Content`,
            returnUrl: `${baseUrl}/dashboard/billing?subscription=success&plan=${plan}`,
            metadata: {
                type: 'subscription',
                plan: plan,
                credits: tariff.credits.toString(),
                price_rub: tariff.priceRub.toString()
            }
        })

        const confirmationUrl = payment.confirmation?.confirmation_url

        if (!confirmationUrl) {
            console.error('[Subscription Payment] No confirmation URL:', payment)
            return NextResponse.json({ error: 'Payment creation failed' }, { status: 500 })
        }

        console.log(`[Subscription Payment] Created for ${plan}: ${payment.id}`)

        return NextResponse.json({
            paymentId: payment.id,
            redirectUrl: confirmationUrl
        })

    } catch (error) {
        console.error('[Subscription Payment] Error:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Payment failed' },
            { status: 500 }
        )
    }
}
