'use server'

import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
import { startOfMonth } from "date-fns"

// Credit packages (internal, returned in getBillingDashboard)
const CREDIT_PACKAGES = [
    { id: 'pack_100', amount: 1, credits: 100, name: '100 кредитов', description: 'Пробный' },
    { id: 'pack_1000', amount: 10, credits: 1000, name: '1,000 кредитов', description: 'Популярный', popular: true },
    { id: 'pack_5000', amount: 50, credits: 5000, name: '5,000 кредитов', description: 'Выгодный' },
    { id: 'pack_20000', amount: 200, credits: 20000, name: '20,000 кредитов', description: 'Максимум' },
]

export async function getBillingDashboard() {
    const user = await getCurrentUser()
    if (!user) throw new Error("Unauthorized")

    const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: {
            credits: true,
            email: true,
            name: true,
            image: true,
            referralBalance: true
        }
    })

    if (!dbUser) throw new Error("User not found")

    // Token usage stats (all time)
    const tokenStats = await prisma.tokenTransaction.aggregate({
        where: { userId: user.id },
        _sum: {
            inputTokens: true,
            outputTokens: true,
            totalCost: true
        },
        _count: { id: true }
    })

    // Credit spending this month
    const startDate = startOfMonth(new Date())
    const creditUsage = await prisma.creditTransaction.aggregate({
        where: {
            userId: user.id,
            createdAt: { gte: startDate },
            amount: { lt: 0 }
        },
        _sum: { amount: true }
    })

    // Purchase history (credit additions)
    const purchases = await prisma.creditTransaction.findMany({
        where: {
            userId: user.id,
            amount: { gt: 0 }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
    })

    // Recent AI transactions
    const aiTransactions = await prisma.tokenTransaction.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 20
    })

    // Calculate average daily spend
    const daysInMonth = new Date().getDate()
    const monthlySpend = Math.abs(creditUsage._sum.amount || 0)
    const avgDailySpend = monthlySpend / daysInMonth
    const daysRemaining = avgDailySpend > 0 ? Math.floor(dbUser.credits / avgDailySpend) : 999

    return {
        user: dbUser,
        stats: {
            credits: dbUser.credits,
            referralBalance: dbUser.referralBalance,
            totalRequests: tokenStats._count.id,
            totalInputTokens: tokenStats._sum.inputTokens || 0,
            totalOutputTokens: tokenStats._sum.outputTokens || 0,
            totalCostUSD: tokenStats._sum.totalCost || 0,
            spentThisMonth: monthlySpend,
            avgDailySpend: Math.round(avgDailySpend),
            daysRemaining: Math.min(daysRemaining, 999)
        },
        purchases,
        aiTransactions,
        packages: CREDIT_PACKAGES
    }
}
