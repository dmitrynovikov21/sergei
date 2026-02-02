"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { approvePayoutRequest, rejectPayoutRequest } from "@/actions/admin-payouts"
import { Check, X, Clock, Wallet } from "lucide-react"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface PayoutRequest {
    id: string
    userId: string
    amount: number
    status: string
    details: string | null
    createdAt: Date
    updatedAt: Date
    user: {
        id: string
        name: string | null
        email: string | null
        referralBalance: number
    } | null
}

interface PayoutsTableProps {
    requests: PayoutRequest[]
}

function StatusBadge({ status }: { status: string }) {
    const styles = {
        PENDING: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
        APPROVED: "bg-green-500/10 text-green-500 border-green-500/20",
        REJECTED: "bg-red-500/10 text-red-500 border-red-500/20",
    }

    const icons = {
        PENDING: Clock,
        APPROVED: Check,
        REJECTED: X,
    }

    const Icon = icons[status as keyof typeof icons] || Clock

    return (
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${styles[status as keyof typeof styles] || styles.PENDING}`}>
            <Icon className="h-3 w-3" />
            {status}
        </span>
    )
}

export function PayoutsTable({ requests }: PayoutsTableProps) {
    const [loading, setLoading] = useState<string | null>(null)

    const handleApprove = async (id: string) => {
        setLoading(id)
        try {
            await approvePayoutRequest(id)
            toast.success("Заявка одобрена! Email отправлен пользователю.")
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Ошибка")
        } finally {
            setLoading(null)
        }
    }

    const handleReject = async (id: string) => {
        setLoading(id)
        try {
            await rejectPayoutRequest(id)
            toast.success("Заявка отклонена. Средства возвращены на баланс.")
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Ошибка")
        } finally {
            setLoading(null)
        }
    }

    const pendingTotal = requests
        .filter(r => r.status === 'PENDING')
        .reduce((sum, r) => sum + r.amount, 0)

    return (
        <div className="space-y-6">
            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Ожидают</CardTitle>
                        <Clock className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {requests.filter(r => r.status === 'PENDING').length}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            На сумму {pendingTotal.toFixed(2)} ₽
                        </p>
                    </CardContent>
                </Card>

                <Card className="">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Одобрено</CardTitle>
                        <Check className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {requests.filter(r => r.status === 'APPROVED').length}
                        </div>
                    </CardContent>
                </Card>

                <Card className="">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Всего заявок</CardTitle>
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{requests.length}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Table */}
            <Card className="">
                <CardHeader>
                    <CardTitle>Список заявок</CardTitle>
                </CardHeader>
                <CardContent>
                    {requests.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">
                            Нет заявок на вывод
                        </p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-white/10">
                                        <th className="text-left py-3 px-2 font-medium text-muted-foreground">Пользователь</th>
                                        <th className="text-left py-3 px-2 font-medium text-muted-foreground">Сумма</th>
                                        <th className="text-left py-3 px-2 font-medium text-muted-foreground">Реквизиты</th>
                                        <th className="text-left py-3 px-2 font-medium text-muted-foreground">Баланс</th>
                                        <th className="text-left py-3 px-2 font-medium text-muted-foreground">Статус</th>
                                        <th className="text-left py-3 px-2 font-medium text-muted-foreground">Дата</th>
                                        <th className="text-right py-3 px-2 font-medium text-muted-foreground">Действия</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {requests.map((request) => (
                                        <tr key={request.id} className="border-b border-white/5 hover:bg-white/5">
                                            <td className="py-3 px-2">
                                                <div>
                                                    <p className="font-medium">{request.user?.name || 'N/A'}</p>
                                                    <p className="text-xs text-muted-foreground">{request.user?.email}</p>
                                                </div>
                                            </td>
                                            <td className="py-3 px-2 font-bold">
                                                {request.amount.toFixed(2)} ₽
                                            </td>
                                            <td className="py-3 px-2 text-muted-foreground max-w-[200px] truncate">
                                                {request.details || '-'}
                                            </td>
                                            <td className="py-3 px-2 text-muted-foreground">
                                                {request.user?.referralBalance.toFixed(2)} ₽
                                            </td>
                                            <td className="py-3 px-2">
                                                <StatusBadge status={request.status} />
                                            </td>
                                            <td className="py-3 px-2 text-muted-foreground">
                                                {new Date(request.createdAt).toLocaleDateString('ru-RU')}
                                            </td>
                                            <td className="py-3 px-2 text-right">
                                                {request.status === 'PENDING' && (
                                                    <div className="flex gap-2 justify-end">
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="bg-green-500/10 border-green-500/20 text-green-500 hover:bg-green-500/20"
                                                                    disabled={loading === request.id}
                                                                >
                                                                    <Check className="h-4 w-4" />
                                                                </Button>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>Одобрить выплату?</AlertDialogTitle>
                                                                    <AlertDialogDescription>
                                                                        Выплата {request.amount.toFixed(2)} ₽ для {request.user?.name || request.user?.email}.
                                                                        Пользователь получит email-уведомление.
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>Отмена</AlertDialogCancel>
                                                                    <AlertDialogAction onClick={() => handleApprove(request.id)}>
                                                                        Одобрить
                                                                    </AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>

                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500/20"
                                                                    disabled={loading === request.id}
                                                                >
                                                                    <X className="h-4 w-4" />
                                                                </Button>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>Отклонить заявку?</AlertDialogTitle>
                                                                    <AlertDialogDescription>
                                                                        Средства {request.amount.toFixed(2)} ₽ будут возвращены на баланс пользователя.
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>Отмена</AlertDialogCancel>
                                                                    <AlertDialogAction
                                                                        onClick={() => handleReject(request.id)}
                                                                        className="bg-red-500 hover:bg-red-600"
                                                                    >
                                                                        Отклонить
                                                                    </AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
