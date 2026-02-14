"use client"

import { useState } from "react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { Wallet, Plus, Minus } from "lucide-react"
import { toast } from "sonner"
import { updateUserCredits } from "@/actions/admin"

// Types for admin user data
interface AdminUserSubscription {
    plan: string
    isActive: boolean
}

interface AdminUserMetrics {
    totalSpentUSD: number
    totalSpentRUB: number
    netProfitRUB: number
    ltvProfitRUB: number
    monthsSubscribed: number
    requestsCount: number
}

interface AdminUser {
    id: string
    name: string | null
    email: string | null
    image: string | null
    emoji: string | null
    role: string
    credits: number
    createdAt: Date
    subscriptions: AdminUserSubscription[]
    metrics: AdminUserMetrics
}

interface AdminUsersClientProps {
    users: AdminUser[]
}

// User avatar component - shows stored emoji or image
function UserAvatar({ user }: { user: AdminUser }) {
    if (user.image) {
        return (
            <img
                src={user.image}
                alt={user.name || user.email || 'User'}
                className="w-7 h-7 rounded-full object-cover shrink-0"
            />
        )
    }

    // Use stored emoji if available
    if (user.emoji) {
        return (
            <span className="text-lg shrink-0" title={user.name || user.email || 'User'}>
                {user.emoji}
            </span>
        )
    }

    // Fallback to first letter
    const initial = user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'
    return (
        <span className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0">
            {initial}
        </span>
    )
}

// Balance Management Modal Component
function BalanceModal({ user, onUpdate }: { user: AdminUser; onUpdate?: () => void }) {
    const [amount, setAmount] = useState("")
    const [reason, setReason] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [open, setOpen] = useState(false)

    async function handleUpdateBalance(action: 'add' | 'subtract') {
        const credits = parseInt(amount)
        if (isNaN(credits) || credits <= 0) {
            toast.error("Введите положительное число")
            return
        }

        setIsLoading(true)
        try {
            const result = await updateUserCredits({
                userId: user.id,
                amount: action === 'add' ? credits : -credits,
                reason: reason || `Ручное ${action === 'add' ? 'пополнение' : 'списание'} администратором`
            })

            if (result.success) {
                toast.success(`Баланс ${action === 'add' ? 'пополнен' : 'списан'}: ${credits} CR`)
                setAmount("")
                setReason("")
                setOpen(false)
                onUpdate?.()
            } else {
                toast.error(result.error || "Ошибка обновления баланса")
            }
        } catch (error) {
            toast.error("Ошибка обновления баланса")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-60 hover:opacity-100">
                    <Wallet className="h-3 w-3" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <UserAvatar user={user} />
                        {user.name || user.email}
                    </DialogTitle>
                    <DialogDescription>
                        Текущий баланс: <span className="font-mono font-bold text-amber-500">{user.credits} CR</span>
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-2 py-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Email:</span>
                        <span className="truncate max-w-[200px]">{user.email}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Роль:</span>
                        <Badge variant="outline">{user.role}</Badge>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Тарифы:</span>
                        <span>{user.subscriptions.filter(s => s.isActive).length || 'Нет'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">LTV:</span>
                        <span className="font-mono text-blue-600">{user.metrics.ltvProfitRUB.toFixed(0)} ₽</span>
                    </div>
                </div>

                <div className="grid gap-4 py-4 border-t">
                    <div className="grid gap-2">
                        <Label htmlFor="amount">Количество CR</Label>
                        <Input
                            id="amount"
                            type="number"
                            min="1"
                            placeholder="Введите количество"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="reason">Причина</Label>
                        <Input
                            id="reason"
                            placeholder="Бонус, коррекция и т.д."
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                        />
                    </div>
                </div>

                <DialogFooter className="flex gap-2 sm:gap-2">
                    <Button
                        variant="outline"
                        onClick={() => handleUpdateBalance('subtract')}
                        disabled={isLoading || !amount}
                        className="flex-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                    >
                        <Minus className="h-4 w-4 mr-1" />
                        Списать
                    </Button>
                    <Button
                        onClick={() => handleUpdateBalance('add')}
                        disabled={isLoading || !amount}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                    >
                        <Plus className="h-4 w-4 mr-1" />
                        Пополнить
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// Compact date format: "5.02"
function formatCompactDate(date: Date): string {
    const d = new Date(date)
    return `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')}`
}

// Tariff badge - simple text
function TariffBadge({ subscriptions }: { subscriptions: AdminUserSubscription[] }) {
    const activeCount = subscriptions.filter(s => s.isActive).length
    const activePlans = subscriptions.filter(s => s.isActive).map(s =>
        s.plan === 'reels' ? 'R' : s.plan === 'carousels' ? 'C' : s.plan[0]?.toUpperCase()
    )

    if (activeCount === 0) return <span className="text-muted-foreground">—</span>

    if (activeCount === 1) return <span className="text-emerald-600">{activePlans[0]}</span>

    return (
        <Tooltip>
            <TooltipTrigger>
                <span className="text-emerald-600">{activeCount}</span>
            </TooltipTrigger>
            <TooltipContent>
                <span className="text-xs">{activePlans.join(', ')}</span>
            </TooltipContent>
        </Tooltip>
    )
}

export function AdminUsersClient({ users }: AdminUsersClientProps) {
    const [, forceUpdate] = useState({})

    return (
        <TooltipProvider>
            <Card className="border-border/50">
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Пользователи ({users.length})</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-border/50 hover:bg-transparent">
                                    <TableHead className="w-[200px]">Пользователь</TableHead>
                                    <TableHead className="w-[50px] text-center">Тариф</TableHead>
                                    <TableHead className="w-[50px] text-center">Дата</TableHead>
                                    <TableHead className="w-[80px] text-right">CR</TableHead>
                                    <TableHead className="w-[70px] text-right">Расход</TableHead>
                                    <TableHead className="w-[70px] text-right">Затраты</TableHead>
                                    <TableHead className="w-[70px] text-right">Прибыль</TableHead>
                                    <TableHead className="w-[70px] text-right">LTV</TableHead>
                                    <TableHead className="w-[40px] text-right">Req</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.map((user) => (
                                    <TableRow key={user.id} className="border-border/30 hover:bg-muted/30">
                                        <TableCell className="py-2">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <UserAvatar user={user} />
                                                <div className="min-w-0 flex-1">
                                                    <div className="font-medium truncate text-sm">{user.name || "—"}</div>
                                                    <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center py-2">
                                            <TariffBadge subscriptions={user.subscriptions} />
                                        </TableCell>
                                        <TableCell className="text-center text-muted-foreground text-xs py-2 whitespace-nowrap">
                                            {formatCompactDate(user.createdAt)}
                                        </TableCell>
                                        <TableCell className="text-right py-2">
                                            <div className="flex items-center justify-end gap-1">
                                                <span className="font-mono text-sm text-amber-600">{user.credits}</span>
                                                <BalanceModal user={user} onUpdate={() => forceUpdate({})} />
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-xs text-emerald-600 py-2 whitespace-nowrap">
                                            ${user.metrics.totalSpentUSD.toFixed(2)}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-xs text-red-500 py-2 whitespace-nowrap">
                                            {user.metrics.totalSpentRUB.toFixed(0)}₽
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-xs text-green-600 py-2 whitespace-nowrap">
                                            {user.metrics.netProfitRUB.toFixed(0)}₽
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-xs text-blue-600 py-2 whitespace-nowrap">
                                            {user.metrics.ltvProfitRUB.toFixed(0)}₽
                                        </TableCell>
                                        <TableCell className="text-right text-xs text-muted-foreground py-2">
                                            {user.metrics.requestsCount}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </TooltipProvider>
    )
}
