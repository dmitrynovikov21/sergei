"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Coins, CreditCard, Activity, Zap, Wallet, TrendingUp, Star, Sparkles, Check, Clock } from "lucide-react"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { TARIFFS, TariffPlan } from "@/lib/billing-config"
import { getMySubscriptions, purchaseSubscription } from "@/actions/subscriptions"

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
    const { user, stats, purchases, aiTransactions, packages } = data
    const [isLoading, setIsLoading] = useState<string | null>(null)
    const [subscriptions, setSubscriptions] = useState<any[]>([])
    const [subLoading, setSubLoading] = useState<TariffPlan | null>(null)

    // Load subscriptions on mount
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

            // Redirect to YooKassa
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

            // Redirect to YooKassa
            window.location.href = data.redirectUrl
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Ошибка оплаты подписки")
            setSubLoading(null)
        }
    }

    const getActiveSubscription = (plan: TariffPlan) => {
        return subscriptions.find(s => s.plan === plan)
    }

    return (
        <div className="space-y-8">
            {/* Balances */}
            <div className="grid gap-4 md:grid-cols-2">
                {/* Credit Balance */}
                <Card className="">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Баланс кредитов
                        </CardTitle>
                        <Coins className="h-5 w-5 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold" suppressHydrationWarning>
                            {stats.credits.toLocaleString()} CR
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                            {stats.daysRemaining < 999
                                ? `≈ ${stats.daysRemaining} дней при текущем расходе`
                                : "Начните использовать AI"
                            }
                        </p>
                    </CardContent>
                </Card>

                {/* Referral Balance */}
                <Card className="">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Реферальный баланс
                        </CardTitle>
                        <Wallet className="h-5 w-5 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">
                            {stats.referralBalance.toFixed(2)} ₽
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                            Доступно для вывода
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Subscription Tariffs */}
            <div>
                <h2 className="text-xl font-semibold mb-4">✨ Тарифные планы</h2>
                <div className="grid gap-4 md:grid-cols-2">
                    {Object.values(TARIFFS).map((tariff) => {
                        const activeSub = getActiveSubscription(tariff.plan)
                        const isActive = !!activeSub

                        return (
                            <Card
                                key={tariff.plan}
                                className={`relative transition-all ${isActive ? 'border-green-500/50 bg-green-500/5' : 'hover:border-primary/50'}`}
                            >
                                {isActive && (
                                    <Badge className="absolute -top-2 right-4 bg-green-500">
                                        <Check className="h-3 w-3 mr-1" />
                                        Активен
                                    </Badge>
                                )}
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Sparkles className="h-5 w-5 text-primary" />
                                        {tariff.name}
                                    </CardTitle>
                                    <CardDescription suppressHydrationWarning>
                                        {tariff.agentPatterns.length} AI-агента • {tariff.credits.toLocaleString()} кредитов/мес
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-3xl font-bold">{tariff.priceRub}₽</span>
                                        <span className="text-muted-foreground">/месяц</span>
                                    </div>

                                    {isActive && activeSub && (
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">Остаток кредитов</span>
                                                <span className="font-medium" suppressHydrationWarning>{activeSub.credits.toLocaleString()} / {activeSub.maxCredits.toLocaleString()}</span>
                                            </div>
                                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-green-500 transition-all"
                                                    style={{ width: `${activeSub.creditsPercent}%` }}
                                                />
                                            </div>
                                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                <Clock className="h-3 w-3" />
                                                Действует до {format(new Date(activeSub.expiresAt), 'd MMM yyyy', { locale: ru })}
                                            </div>
                                        </div>
                                    )}

                                    <ul className="text-sm space-y-1">
                                        {tariff.agentPatterns.map((pattern) => (
                                            <li key={pattern} className="flex items-center gap-2">
                                                <Check className="h-4 w-4 text-green-500" />
                                                {pattern.charAt(0).toUpperCase() + pattern.slice(1)}
                                            </li>
                                        ))}
                                    </ul>

                                    {!isActive && (
                                        <Button
                                            className="w-full"
                                            onClick={() => handleSubscriptionPurchase(tariff.plan)}
                                            disabled={subLoading === tariff.plan}
                                        >
                                            {subLoading === tariff.plan ? "Обработка..." : "Подключить"}
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            </div>

            {/* Credit Packages */}
            <div>
                <h2 className="text-xl font-semibold mb-4">💳 Пополнить баланс</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {packages.map((pkg) => (
                        <Card
                            key={pkg.id}
                            className={`relative transition-all hover:border-primary/50 ${pkg.popular ? 'border-primary/50' : ''}`}
                        >
                            {pkg.popular && (
                                <Badge className="absolute -top-2 left-1/2 -translate-x-1/2">
                                    <Star className="h-3 w-3 mr-1" />
                                    Популярный
                                </Badge>
                            )}
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg">{pkg.name}</CardTitle>
                                <CardDescription>{pkg.description}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold mb-4">
                                    {pkg.amount} ₽
                                </div>
                                <Button
                                    className="w-full"
                                    onClick={() => handlePurchase(pkg.id)}
                                    disabled={isLoading === pkg.id}
                                >
                                    {isLoading === pkg.id ? "Загрузка..." : "Купить"}
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card className="">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Запросов</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalRequests}</div>
                        <p className="text-xs text-muted-foreground">Всего за всё время</p>
                    </CardContent>
                </Card>

                <Card className="">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Расход за месяц</CardTitle>
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.spentThisMonth} CR</div>
                        <p className="text-xs text-muted-foreground">~{stats.avgDailySpend} CR/день</p>
                    </CardContent>
                </Card>

                <Card className="">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Токенов</CardTitle>
                        <Zap className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {((stats.totalInputTokens + stats.totalOutputTokens) / 1000).toFixed(1)}k
                        </div>
                        <p className="text-xs text-muted-foreground" suppressHydrationWarning>
                            Вход: {stats.totalInputTokens.toLocaleString()}
                        </p>
                    </CardContent>
                </Card>

                <Card className="">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Прогноз</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {stats.daysRemaining < 999 ? `${stats.daysRemaining} дн.` : "∞"}
                        </div>
                        <p className="text-xs text-muted-foreground">При текущем темпе</p>
                    </CardContent>
                </Card>
            </div>

            {/* Transaction History Tabs */}
            <Tabs defaultValue="usage" className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-md">
                    <TabsTrigger value="usage">Расходы</TabsTrigger>
                    <TabsTrigger value="purchases">Пополнения</TabsTrigger>
                </TabsList>

                <TabsContent value="usage">
                    <Card className="">
                        <CardHeader>
                            <CardTitle>История AI-запросов</CardTitle>
                            <CardDescription>Последние 20 транзакций</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Дата</TableHead>
                                        <TableHead>Модель</TableHead>
                                        <TableHead className="text-right">Токены</TableHead>
                                        <TableHead className="text-right">Стоимость</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {aiTransactions.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                                Нет транзакций
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    {aiTransactions.map((tx: any) => (
                                        <TableRow key={tx.id}>
                                            <TableCell className="font-medium" suppressHydrationWarning>
                                                {format(new Date(tx.createdAt), 'd MMM, HH:mm', { locale: ru })}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="font-mono text-xs">
                                                    {tx.model}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-xs" suppressHydrationWarning>
                                                {(tx.inputTokens + tx.outputTokens).toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-xs text-emerald-400">
                                                ${tx.totalCost.toFixed(4)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="purchases">
                    <Card className="">
                        <CardHeader>
                            <CardTitle>История пополнений</CardTitle>
                            <CardDescription>Покупки и бонусы</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Дата</TableHead>
                                        <TableHead>Тип</TableHead>
                                        <TableHead className="text-right">Кредиты</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {purchases.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                                                Нет пополнений
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    {purchases.map((tx: any) => (
                                        <TableRow key={tx.id}>
                                            <TableCell className="font-medium" suppressHydrationWarning>
                                                {format(new Date(tx.createdAt), 'd MMM yyyy, HH:mm', { locale: ru })}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">
                                                    {tx.reason === 'purchase' && '💳 Покупка'}
                                                    {tx.reason === 'free-test-credits' && '🎁 Бонус'}
                                                    {tx.reason === 'referral-conversion' && '🔄 Конверсия'}
                                                    {!['purchase', 'free-test-credits', 'referral-conversion'].includes(tx.reason) && tx.reason}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-green-400">
                                                +{tx.amount} CR
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
