"use client"

import { useRouter } from "next/navigation"
import { Lock, Sparkles, CreditCard } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { TariffPlan, TARIFFS } from "@/lib/billing-config"

interface SubscriptionRequiredModalProps {
    isOpen: boolean
    onClose: () => void
    requiredPlan?: TariffPlan | null
    errorType?: 'SUBSCRIPTION_REQUIRED' | 'CREDITS_EXHAUSTED'
}

export function SubscriptionRequiredModal({
    isOpen,
    onClose,
    requiredPlan,
    errorType = 'SUBSCRIPTION_REQUIRED'
}: SubscriptionRequiredModalProps) {
    const router = useRouter()

    const tariff = requiredPlan ? TARIFFS[requiredPlan] : null
    const isExhausted = errorType === 'CREDITS_EXHAUSTED'

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                        {isExhausted ? (
                            <CreditCard className="h-6 w-6 text-primary" />
                        ) : (
                            <Lock className="h-6 w-6 text-primary" />
                        )}
                    </div>
                    <DialogTitle className="text-center">
                        {isExhausted ? 'Лимит исчерпан' : 'Нужна подписка'}
                    </DialogTitle>
                    <DialogDescription className="text-center">
                        {isExhausted ? (
                            <>
                                Вы использовали весь лимит кредитов по тарифу <strong>"{tariff?.name}"</strong>.
                                <br />
                                Дождитесь обновления 1-го числа или приобретите дополнительный пакет.
                            </>
                        ) : (
                            <>
                                Для использования этого агента требуется подписка{' '}
                                <strong>"{tariff?.name}"</strong>.
                            </>
                        )}
                    </DialogDescription>
                </DialogHeader>

                {tariff && !isExhausted && (
                    <div className="rounded-lg border bg-muted/50 p-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{tariff.name}</span>
                            <span className="text-xl font-bold">{tariff.priceRub}₽<span className="text-sm font-normal text-muted-foreground">/мес</span></span>
                        </div>
                        <ul className="text-sm text-muted-foreground space-y-1">
                            <li className="flex items-center gap-2">
                                <Sparkles className="h-3 w-3" />
                                Доступ к {tariff.agentPatterns.length} агентам
                            </li>
                            <li className="flex items-center gap-2">
                                <Sparkles className="h-3 w-3" />
                                {tariff.credits.toLocaleString()} кредитов/мес
                            </li>
                        </ul>
                    </div>
                )}

                <DialogFooter className="flex-col gap-2 sm:flex-col">
                    <Button
                        onClick={() => router.push("/dashboard/billing")}
                        className="w-full"
                    >
                        <CreditCard className="mr-2 h-4 w-4" />
                        {isExhausted ? 'Докупить кредиты' : 'Выбрать подписку'}
                    </Button>
                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="w-full"
                    >
                        Закрыть
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
