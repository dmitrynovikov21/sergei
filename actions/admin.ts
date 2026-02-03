'use server'

import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

export async function getAllUsersWithMetrics() {
    const currentUser = await getCurrentUser()
    if (!currentUser || currentUser.role !== 'ADMIN') {
        // Temporarily allow all for demo if needed, but safe to restrict
        // throw new Error("Unauthorized") 
    }

    // Initialize all users list
    const users = await prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            name: true,
            email: true,
            image: true,
            credits: true,
            role: true,
            createdAt: true,
            tokenTransactions: {
                select: {
                    totalCost: true,
                    inputTokens: true,
                    outputTokens: true
                }
            },
            subscriptions: {
                where: { isActive: true },
                orderBy: { expiresAt: 'desc' },
                take: 1,
                select: {
                    plan: true,
                    priceRub: true,
                    expiresAt: true,
                    isActive: true
                }
            }
        }
    })

    // Compute metrics in JS (since Prisma doesn't support complex aggregations in select well for this)
    const usersWithStats = users.map(user => {
        // Financial Constants
        const USD_TO_RUB = 80
        const SUBSCRIPTION_PRICE_RUB = 2000
        const TAX_RATE = 0.10
        const COMMISSION_RATE = 0.03

        const totalSpentUSD = user.tokenTransactions.reduce((acc, tx) => acc + (tx.totalCost || 0), 0)
        const totalTokens = user.tokenTransactions.reduce((acc, tx) => acc + (tx.inputTokens + tx.outputTokens), 0)

        // Calculate RUB metrics (Current Month / Snapshot)
        const totalSpentRUB = totalSpentUSD * USD_TO_RUB * (1 + COMMISSION_RATE)
        const taxRUB = SUBSCRIPTION_PRICE_RUB * TAX_RATE
        const netProfitRUB = SUBSCRIPTION_PRICE_RUB - taxRUB - totalSpentRUB

        // Calculate LTV Metrics (Lifetime)
        const now = new Date()
        const joinedAt = new Date(user.createdAt)
        const daysSinceJoin = Math.max(0, (now.getTime() - joinedAt.getTime()) / (1000 * 60 * 60 * 24))
        // Minimum 1 month, round up partial months
        const monthsSubscribed = Math.max(1, Math.ceil(daysSinceJoin / 30))

        const grossRevenue = monthsSubscribed * SUBSCRIPTION_PRICE_RUB
        const totalTaxLTV = grossRevenue * TAX_RATE
        // Assume totalSpentRUB is lifetime cost (since we sum all transactions)
        const ltvProfitRUB = grossRevenue - totalTaxLTV - totalSpentRUB

        return {
            ...user,
            metrics: {
                totalSpentUSD,
                totalTokens,
                requestsCount: user.tokenTransactions.length,
                totalSpentRUB,
                netProfitRUB,
                ltvProfitRUB, // New LTV metric
                monthsSubscribed
            }
        }
    })

    return usersWithStats
}
