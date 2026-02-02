import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'

export async function GET() {
    try {
        const user = await getCurrentUser()
        if (!user?.id) {
            return NextResponse.json({ claimed: false })
        }

        // Check if user already claimed free credits
        const existingClaim = await prisma.creditTransaction.findFirst({
            where: {
                userId: user.id,
                reason: 'free-test-credits'
            }
        })

        return NextResponse.json({ claimed: !!existingClaim })

    } catch (error) {
        return NextResponse.json({ claimed: false })
    }
}
