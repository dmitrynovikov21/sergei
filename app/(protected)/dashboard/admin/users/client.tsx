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
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { HelpCircle } from "lucide-react"

interface AdminUsersClientProps {
    users: any[]
}

export function AdminUsersClient({ users }: AdminUsersClientProps) {
    return (
        <TooltipProvider>
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
                                <TableHead>Тариф</TableHead>
                                <TableHead>Регистрация</TableHead>
                                <TableHead className="text-right">Баланс</TableHead>
                                <TableHead className="text-right">
                                    <Tooltip>
                                        <TooltipTrigger className="flex items-center gap-1 justify-end">
                                            Расход ($)
                                            <HelpCircle className="h-3 w-3 text-muted-foreground" />
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="max-w-xs">
                                            <p className="font-medium mb-1">Затраты на API Claude</p>
                                            <code className="text-xs bg-muted px-1 rounded">
                                                input_tokens × $3/1M + output_tokens × $15/1M
                                            </code>
                                        </TooltipContent>
                                    </Tooltip>
                                </TableHead>
                                <TableHead className="text-right">
                                    <Tooltip>
                                        <TooltipTrigger className="flex items-center gap-1 justify-end">
                                            Затраты (₽)
                                            <HelpCircle className="h-3 w-3 text-muted-foreground" />
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="max-w-xs">
                                            <p className="font-medium mb-1">Наши затраты в рублях</p>
                                            <code className="text-xs bg-muted px-1 rounded">
                                                Расход USD × курс ЦБ
                                            </code>
                                        </TooltipContent>
                                    </Tooltip>
                                </TableHead>
                                <TableHead className="text-right">
                                    <Tooltip>
                                        <TooltipTrigger className="flex items-center gap-1 justify-end">
                                            Прибыль (Мес)
                                            <HelpCircle className="h-3 w-3 text-muted-foreground" />
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="max-w-xs">
                                            <p className="font-medium mb-1">Чистая прибыль за месяц</p>
                                            <code className="text-xs bg-muted px-1 rounded">
                                                Оплаты − Затраты
                                            </code>
                                        </TooltipContent>
                                    </Tooltip>
                                </TableHead>
                                <TableHead className="text-right">
                                    <Tooltip>
                                        <TooltipTrigger className="flex items-center gap-1 justify-end">
                                            LTV Прибыль
                                            <HelpCircle className="h-3 w-3 text-muted-foreground" />
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="max-w-xs">
                                            <p className="font-medium mb-1">Lifetime Value прибыль</p>
                                            <code className="text-xs bg-muted px-1 rounded">
                                                Σ(Оплаты) − Σ(Затраты за всё время)
                                            </code>
                                        </TooltipContent>
                                    </Tooltip>
                                </TableHead>
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
                                    <TableCell>
                                        {user.subscriptions?.[0] ? (
                                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                                                {user.subscriptions[0].plan === 'reels' ? 'Reels' : 'Carousels'}
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-muted-foreground">
                                                Free
                                            </Badge>
                                        )}
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
        </TooltipProvider>
    )
}
