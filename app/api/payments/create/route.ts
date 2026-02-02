import { NextRequest, NextResponse } from 'next/server'
import { createPayment } from '@/lib/yookassa'
import { getCurrentUser } from '@/lib/session'

// Pricing: 1 RUB = 100 credits
const CREDIT_PACKAGES = [
    { id: 'pack_100', amount: 1, credits: 100, name: '100 кредитов' },
    { id: 'pack_1000', amount: 10, credits: 1000, name: '1,000 кредитов' },
    { id: 'pack_5000', amount: 50, credits: 5000, name: '5,000 кредитов' },
    { id: 'pack_20000', amount: 200, credits: 20000, name: '20,000 кредитов' },
]

export async function POST(req: NextRequest) {
    try {
        const user = await getCurrentUser()
        if (!user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { packageId } = body

        const pkg = CREDIT_PACKAGES.find(p => p.id === packageId)
        if (!pkg) {
            return NextResponse.json({ error: 'Invalid package' }, { status: 400 })
        }

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

        const payment = await createPayment({
            amount: pkg.amount,
            userId: user.id,
            description: `Покупка ${pkg.name} - AI Content`,
            returnUrl: `${baseUrl}/dashboard/billing?success=true`,
            metadata: {
                package_id: pkg.id,
                credits: pkg.credits.toString()
            }
        })

        const confirmationUrl = payment.confirmation?.confirmation_url

        if (!confirmationUrl) {
            console.error('[Payments] No confirmation URL:', payment)
            return NextResponse.json({ error: 'Payment creation failed' }, { status: 500 })
        }

        return NextResponse.json({
            paymentId: payment.id,
            redirectUrl: confirmationUrl
        })

    } catch (error) {
        console.error('[Payments] Error:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Payment failed' },
            { status: 500 }
        )
    }
}

export async function GET() {
    // Return available packages
    return NextResponse.json({ packages: CREDIT_PACKAGES })
}
