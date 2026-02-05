"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { useState } from "react"
import { requestPayout, paySubscriptionFromReferralBalance } from "@/actions/referrals"
import { Copy, CreditCard, Users, Wallet, TrendingUp, Clock } from "lucide-react"

interface ReferralStats {
    referralCode: string | null
    balance: number
    referralsCount: number
    transactions: any[]
    payouts: any[]
}

export function ReferralDashboardClient({ stats }: { stats: ReferralStats }) {
    const [isLoading, setIsLoading] = useState(false)
    const [payoutDetails, setPayoutDetails] = useState("")
    const [payoutAmount, setPayoutAmount] = useState(1000)

    const referralLink = typeof window !== "undefined"
        ? `${window.location.origin}/register?ref=${stats.referralCode}`
        : `https://aicontent.pro/register?ref=${stats.referralCode}`

    const copyLink = () => {
        navigator.clipboard.writeText(referralLink)
        toast.success("Ссылка скопирована!")
    }

    const handlePayout = async () => {
        if (payoutAmount < 1000) {
            toast.error("Минимальная сумма вывода — 1,000 ₽")
            return
        }
        if (payoutAmount > stats.balance) {
            toast.error("Недостаточно средств на балансе")
            return
        }
        if (!payoutDetails) {
            toast.error("Укажите реквизиты для вывода")
            return
        }

        setIsLoading(true)
        try {
            await requestPayout(payoutAmount, payoutDetails)
            toast.success("Заявка отправлена! Администратор рассмотрит её в ближайшее время.")
            setPayoutDetails("")
            setPayoutAmount(1000)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Произошла ошибка")
        } finally {
            setIsLoading(false)
        }
    }

    const handleInternalPay = async () => {
        setIsLoading(true)
        try {
            await paySubscriptionFromReferralBalance()
            toast.success("Успешно! Кредиты зачислены на ваш аккаунт.")
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Недостаточно средств")
        } finally {
            setIsLoading(false)
        }
    }

    const pendingPayouts = stats.payouts.filter(p => p.status === 'PENDING')

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-border/50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Баланс
                        </CardTitle>
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.balance.toFixed(2)} ₽</div>
                        <p className="text-xs text-muted-foreground">
                            Доступно для вывода
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-border/50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Рефералы
                        </CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.referralsCount}</div>
                        <p className="text-xs text-muted-foreground">
                            Приглашённых пользователей
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-border/50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Комиссия
                        </CardTitle>
                        <TrendingUp className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">30%</div>
                        <p className="text-xs text-muted-foreground">
                            С каждой покупки реферала
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-border/50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            На рассмотрении
                        </CardTitle>
                        <Clock className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{pendingPayouts.length}</div>
                        <p className="text-xs text-muted-foreground">
                            Заявок на вывод
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Referral Link */}
            <Card className="border-border/50">
                <CardHeader>
                    <CardTitle>🔗 Ваша реферальная ссылка</CardTitle>
                    <CardDescription>
                        Поделитесь этой ссылкой и получайте 30% с каждой покупки приглашённых пользователей
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-2">
                        <Input
                            readOnly
                            value={referralLink}
                            className="bg-muted border-border"
                        />
                        <Button onClick={copyLink} className="shrink-0">
                            <Copy className="h-4 w-4 mr-2" />
                            Скопировать
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Withdraw - Full width */}
            <Card className="border-border/50">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Wallet className="h-5 w-5 text-green-500" />
                        Вывести деньги
                    </CardTitle>
                    <CardDescription>
                        Выведите средства на карту или электронный кошелёк. Минимум: 1,000 ₽
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-3 items-end">
                        <div className="space-y-2">
                            <Label>Сумма</Label>
                            <Input
                                type="number"
                                placeholder="1000"
                                value={payoutAmount}
                                onChange={(e) => setPayoutAmount(Number(e.target.value))}
                                className="bg-background border-border"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Реквизиты</Label>
                            <Input
                                placeholder="Номер карты / Телефон / USDT"
                                value={payoutDetails}
                                onChange={(e) => setPayoutDetails(e.target.value)}
                                className="bg-background border-border"
                            />
                        </div>
                        <Button
                            onClick={handlePayout}
                            disabled={stats.balance < 1000 || isLoading}
                            className="h-10"
                        >
                            Отправить заявку
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Transaction History */}
            <Card className="border-border/50">
                <CardHeader>
                    <CardTitle>📊 История транзакций</CardTitle>
                </CardHeader>
                <CardContent>
                    {stats.transactions.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">
                            Пока нет транзакций. Пригласите друзей по вашей ссылке!
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {stats.transactions.map((tx) => (
                                <div key={tx.id} className="flex items-center justify-between border-b border-white/5 pb-3 last:border-0 last:pb-0">
                                    <div>
                                        <p className="font-medium">
                                            {tx.type === 'COMMISSION' && '💰 Комиссия'}
                                            {tx.type === 'WITHDRAWAL_HOLD' && '⏳ Заявка на вывод'}
                                            {tx.type === 'PAYOUT_APPROVED' && '✅ Выплата одобрена'}
                                            {tx.type === 'PAYOUT_REJECTED' && '↩️ Возврат средств'}
                                            {tx.type === 'SPEND_INTERNAL' && '💳 Покупка кредитов'}
                                            {tx.type === 'ADMIN_ADJUSTMENT' && '⚙️ Корректировка'}
                                            {!['COMMISSION', 'WITHDRAWAL_HOLD', 'PAYOUT_APPROVED', 'PAYOUT_REJECTED', 'SPEND_INTERNAL', 'ADMIN_ADJUSTMENT'].includes(tx.type) && tx.type}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            {new Date(tx.createdAt).toLocaleDateString('ru-RU', {
                                                day: 'numeric',
                                                month: 'long',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </p>
                                    </div>
                                    <div className={tx.amount > 0 ? "text-green-500 font-bold" : "text-red-400 font-bold"}>
                                        {tx.amount > 0 ? "+" : ""}{tx.amount.toFixed(2)} ₽
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
