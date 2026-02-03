"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Coins, Check, Clock, Film, LayoutGrid, Sparkles } from "lucide-react"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { TARIFFS, TariffPlan } from "@/lib/billing-config"
import { getMySubscriptions } from "@/actions/subscriptions"

interface BillingDashboardProps {
    data: {
        user: any
        stats: {
            credits: number
            referralBalance: number
            totalRequests: number
            totalInputTokens: number
            totalOutputTokens: number
            totalCostUSD: number
            spentThisMonth: number
            avgDailySpend: number
            daysRemaining: number
        }
        purchases: any[]
        aiTransactions: any[]
        packages: {
            id: string
            amount: number
            credits: number
            name: string
            description: string
            popular?: boolean
        }[]
    }
}

export function BillingDashboard({ data }: BillingDashboardProps) {
    const { user, stats, purchases, packages } = data
    const [isLoading, setIsLoading] = useState<string | null>(null)
    const [subscriptions, setSubscriptions] = useState<any[]>([])
    const [subLoading, setSubLoading] = useState<TariffPlan | null>(null)

    useEffect(() => {
        getMySubscriptions().then(setSubscriptions).catch(console.error)
    }, [])

    const handlePurchase = async (packageId: string) => {
        setIsLoading(packageId)
        try {
            const res = await fetch('/api/payments/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ packageId })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            window.location.href = data.redirectUrl
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Ошибка оплаты")
            setIsLoading(null)
        }
    }

    const handleSubscriptionPurchase = async (plan: TariffPlan) => {
        setSubLoading(plan)
        try {
            const res = await fetch('/api/payments/subscription', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ plan })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            window.location.href = data.redirectUrl
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Ошибка оплаты подписки")
            setSubLoading(null)
        }
    }

    const getActiveSubscription = (plan: TariffPlan) => {
        return subscriptions.find(s => s.plan === plan)
    }

    // Icons for plans
    const planIcons: Record<string, React.ReactNode> = {
        'free': <Sparkles className="h-6 w-6" />,
        'reels': <Film className="h-6 w-6" />,
        'carousels': <LayoutGrid className="h-6 w-6" />,
    }

    // Free plan definition
    const freePlan = {
        plan: 'free',
        name: 'Бесплатный',
        priceRub: 0,
        credits: 100,
        agentPatterns: ['Тестовые запросы', 'Ограниченный функционал'],
    }

    // All plans including free
    const allPlans = [freePlan, ...Object.values(TARIFFS)]

    return (
        <div className="space-y-10 max-w-3xl">
            {/* Balance Section - Minimal */}
            <div className="flex items-center justify-between py-4 border-b border-border">
                <div>
                    <p className="text-xs text-muted-foreground mb-1">Ваш баланс</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold tabular-nums" suppressHydrationWarning>
                            {stats.credits.toLocaleString()}
                        </span>
                        <span className="text-sm text-muted-foreground">кредитов</span>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-xs text-muted-foreground mb-1">Реферальный баланс</p>
                    <span className="text-xl font-semibold tabular-nums">{stats.referralBalance.toFixed(0)} ₽</span>
                </div>
            </div>

            {/* Subscription Plans - 3 columns */}
            <div>
                <h2 className="text-base font-medium mb-4">Выберите план</h2>
                <div className="grid gap-3 md:grid-cols-3">
                    {allPlans.map((tariff) => {
                        const activeSub = getActiveSubscription(tariff.plan as TariffPlan)
                        const isActive = !!activeSub
                        const isFree = tariff.plan === 'free'

                        return (
                            <div
                                key={tariff.plan}
                                className={cn(
                                    "relative rounded-lg border p-4 transition-all",
                                    isActive
                                        ? "border-[#D97757] ring-1 ring-[#D97757]/30"
                                        : "border-[#3F3C39] hover:border-[#5A5754]"
                                )}
                                style={{ backgroundColor: '#2D2B29' }}
                            >
                                {/* Icon + Name Row */}
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-muted-foreground">
                                        {planIcons[tariff.plan] || <Sparkles className="h-5 w-5" />}
                                    </span>
                                    <h3 className="text-base font-semibold">{tariff.name}</h3>
                                </div>

                                {/* Description */}
                                <p className="text-xs text-muted-foreground mb-3">
                                    {isFree
                                        ? `${tariff.credits} кредитов`
                                        : `${tariff.agentPatterns.length} AI-агента • ${tariff.credits.toLocaleString()} CR/мес`
                                    }
                                </p>

                                {/* Price */}
                                <div className="flex items-baseline gap-1 mb-4">
                                    <span className="text-2xl font-bold tabular-nums">
                                        {isFree ? 'Бесплатно' : `${tariff.priceRub}₽`}
                                    </span>
                                    {!isFree && <span className="text-muted-foreground text-xs">/мес</span>}
                                </div>

                                {/* Action Button */}
                                {isFree ? (
                                    <Button
                                        variant="outline"
                                        className="w-full text-xs h-8"
                                        disabled
                                    >
                                        Текущий план
                                    </Button>
                                ) : isActive ? (
                                    <div className="space-y-2">
                                        <Button
                                            variant="outline"
                                            className="w-full border-accent/50 text-accent hover:bg-accent/10 text-xs h-8"
                                            disabled
                                        >
                                            <Check className="h-3 w-3 mr-1" />
                                            Активен
                                        </Button>

                                        {/* Progress */}
                                        <div className="space-y-1.5">
                                            <div className="flex justify-between text-[10px] text-muted-foreground">
                                                <span>Использовано</span>
                                                <span className="tabular-nums">{activeSub.credits.toLocaleString()} / {activeSub.maxCredits.toLocaleString()}</span>
                                            </div>
                                            <div className="h-1 bg-muted rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-accent transition-all rounded-full"
                                                    style={{ width: `${activeSub.creditsPercent}%` }}
                                                />
                                            </div>
                                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                                <Clock className="h-2.5 w-2.5" />
                                                до {format(new Date(activeSub.expiresAt), 'd MMM', { locale: ru })}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <Button
                                        className="w-full text-xs h-8"
                                        onClick={() => handleSubscriptionPurchase(tariff.plan as TariffPlan)}
                                        disabled={subLoading === tariff.plan}
                                    >
                                        {subLoading === tariff.plan ? "..." : "Подключить"}
                                    </Button>
                                )}

                                {/* Features - compact */}
                                <ul className="mt-3 space-y-1 text-xs">
                                    {tariff.agentPatterns.map((pattern) => (
                                        <li key={pattern} className="flex items-center gap-1.5 text-muted-foreground">
                                            <Check className="h-3 w-3 text-accent flex-shrink-0" />
                                            <span className="truncate">{pattern.charAt(0).toUpperCase() + pattern.slice(1)}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Credit Packages - Compact */}
            <div>
                <h2 className="text-lg font-medium mb-6">Пополнить баланс</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {packages.map((pkg) => (
                        <button
                            key={pkg.id}
                            onClick={() => handlePurchase(pkg.id)}
                            disabled={isLoading === pkg.id}
                            className={cn(
                                "relative rounded-lg border p-4 text-left transition-all border-[#3F3C39] hover:border-[#D97757]/50",
                                pkg.popular && "border-[#D97757]/30",
                                isLoading === pkg.id && "opacity-50 cursor-not-allowed"
                            )}
                            style={{ backgroundColor: '#2D2B29' }}
                        >
                            {pkg.popular && (
                                <Badge className="absolute -top-2 right-3 bg-accent text-accent-foreground text-[10px] px-1.5 py-0">
                                    Выгодно
                                </Badge>
                            )}
                            <div className="text-2xl font-bold tabular-nums mb-1">
                                {pkg.credits >= 1000 ? `${pkg.credits / 1000}K` : pkg.credits}
                            </div>
                            <div className="text-xs text-muted-foreground mb-3">кредитов</div>
                            <div className="text-lg font-semibold">{pkg.amount} ₽</div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Stats Row - Minimal */}
            <div className="flex items-center justify-between py-4 border-y border-border text-sm">
                <div className="text-center">
                    <div className="text-2xl font-bold tabular-nums">{stats.totalRequests}</div>
                    <div className="text-muted-foreground">запросов</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl font-bold tabular-nums">{stats.spentThisMonth}</div>
                    <div className="text-muted-foreground">CR/мес</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl font-bold tabular-nums">
                        {((stats.totalInputTokens + stats.totalOutputTokens) / 1000).toFixed(0)}K
                    </div>
                    <div className="text-muted-foreground">токенов</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl font-bold tabular-nums">
                        {stats.daysRemaining < 999 ? stats.daysRemaining : "∞"}
                    </div>
                    <div className="text-muted-foreground">дней</div>
                </div>
            </div>

            {/* Purchase History - Clean Table */}
            <div>
                <h2 className="text-lg font-medium mb-4">История пополнений</h2>
                <div className="rounded-lg border border-border overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/30">
                                <TableHead className="text-xs uppercase tracking-wide text-muted-foreground">Дата</TableHead>
                                <TableHead className="text-xs uppercase tracking-wide text-muted-foreground">Тип</TableHead>
                                <TableHead className="text-xs uppercase tracking-wide text-muted-foreground text-right">Кредиты</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {purchases.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                                        История пуста
                                    </TableCell>
                                </TableRow>
                            )}
                            {purchases.slice(0, 10).map((tx: any) => (
                                <TableRow key={tx.id}>
                                    <TableCell className="text-sm tabular-nums" suppressHydrationWarning>
                                        {format(new Date(tx.createdAt), 'd MMM yyyy', { locale: ru })}
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {tx.reason === 'purchase' && 'Покупка'}
                                        {tx.reason === 'subscription' && 'Подписка'}
                                        {tx.reason === 'free-test-credits' && 'Бонус'}
                                        {tx.reason === 'referral-conversion' && 'Реферал'}
                                        {!['purchase', 'subscription', 'free-test-credits', 'referral-conversion'].includes(tx.reason) && tx.reason}
                                    </TableCell>
                                    <TableCell className="text-right font-medium text-accent tabular-nums">
                                        +{tx.amount.toLocaleString()}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div >
    )
}
