"use client"

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { format } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface AdminUsersClientProps {
    users: any[]
}

export function AdminUsersClient({ users }: AdminUsersClientProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Все пользователи ({users.length})</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Пользователь</TableHead>
                            <TableHead>Роль</TableHead>
                            <TableHead>Регистрация</TableHead>
                            <TableHead className="text-right">Баланс</TableHead>
                            <TableHead className="text-right">Расход ($)</TableHead>
                            <TableHead className="text-right">Затраты (₽)</TableHead>
                            <TableHead className="text-right">Прибыль (Мес)</TableHead>
                            <TableHead className="text-right">LTV Прибыль</TableHead>
                            <TableHead className="text-right">Запросы</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.map((user) => (
                            <TableRow key={user.id}>
                                <TableCell className="flex items-center gap-3">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={user.image} alt={user.name || ""} />
                                        <AvatarFallback>{user.name?.[0]?.toUpperCase() || "U"}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col">
                                        <span className="font-medium">{user.name || "No Name"}</span>
                                        <span className="text-xs text-muted-foreground">{user.email}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline">{user.role || "USER"}</Badge>
                                </TableCell>
                                <TableCell className="text-muted-foreground text-sm">
                                    {format(new Date(user.createdAt), 'MMM d, yyyy')}
                                </TableCell>
                                <TableCell className="text-right font-mono text-amber-600 dark:text-amber-400">
                                    <div>{user.credits} CR</div>
                                    <div className="text-[10px] text-muted-foreground">≈ ${(user.credits / 1000).toFixed(2)}</div>
                                </TableCell>
                                <TableCell className="text-right font-mono text-emerald-600 dark:text-emerald-400">
                                    ${user.metrics.totalSpentUSD.toFixed(4)}
                                </TableCell>
                                <TableCell className="text-right font-mono text-red-500">
                                    {user.metrics.totalSpentRUB.toFixed(2)} ₽
                                </TableCell>
                                <TableCell className="text-right font-mono font-bold text-green-600">
                                    {user.metrics.netProfitRUB.toFixed(0)} ₽
                                </TableCell>
                                <TableCell className="text-right font-mono font-bold text-blue-600">
                                    {user.metrics.ltvProfitRUB.toFixed(0)} ₽
                                    <div className="text-[10px] text-muted-foreground font-normal">
                                        {user.metrics.monthsSubscribed} мес.
                                    </div>
                                </TableCell>
                                <TableCell className="text-right text-muted-foreground">
                                    {user.metrics.requestsCount}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}
