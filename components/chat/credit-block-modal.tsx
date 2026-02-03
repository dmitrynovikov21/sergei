"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, CreditCard, Gift } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { getBlockingStatus, checkFreeCreditsEligibility } from "@/actions/credits"
import { toast } from "sonner"

interface CreditBlockModalProps {
    isOpen: boolean
    onClose: () => void
}

export function CreditBlockModal({ isOpen, onClose }: CreditBlockModalProps) {
    const router = useRouter()
    const [status, setStatus] = useState<{
        balance: number
        balanceFormatted: string
        thresholdFormatted: string
    } | null>(null)
    const [canClaimDemo, setCanClaimDemo] = useState(false)
    const [isClaiming, setIsClaiming] = useState(false)

    useEffect(() => {
        if (isOpen) {
            getBlockingStatus().then((res) => {
                if (!("error" in res)) {
                    setStatus(res)
                }
            })
            // Check if user can claim free demo credits
            checkFreeCreditsEligibility().then((res) => {
                setCanClaimDemo(res.eligible)
            })
        }
    }, [isOpen])

    const handleClaimDemo = async () => {
        setIsClaiming(true)
        try {
            const res = await fetch("/api/payments/free-test", { method: "POST" })
            const data = await res.json()
            if (data.success) {
                toast.success("🎉 Демо-доступ активирован! +100 кредитов")
                onClose()
                router.refresh()
            } else {
                toast.error(data.error || "Ошибка получения демо")
            }
        } catch {
            toast.error("Ошибка сети")
        } finally {
            setIsClaiming(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                        <AlertTriangle className="h-6 w-6 text-destructive" />
                    </div>
                    <DialogTitle className="text-center">
                        {canClaimDemo ? "Получите демо-доступ" : "Недостаточно кредитов"}
                    </DialogTitle>
                    <DialogDescription className="text-center">
                        {canClaimDemo ? (
                            "Активируйте бесплатный демо-доступ: 100 кредитов для тестирования всех возможностей AI-агентов"
                        ) : (
                            <>
                                Ваш баланс ({status?.balanceFormatted ?? "..."}) опустился ниже минимального порога ({status?.thresholdFormatted ?? "..."}).
                                Пожалуйста, пополните баланс для продолжения использования AI.
                            </>
                        )}
                    </DialogDescription>
                </DialogHeader>

                <div className="rounded-lg border bg-muted/50 p-4 text-center">
                    <p className="text-sm text-muted-foreground mb-1">Текущий баланс</p>
                    <p className="text-2xl font-bold text-destructive">
                        {status?.balanceFormatted ?? "..."}
                    </p>
                </div>

                <DialogFooter className="flex-col gap-2 sm:flex-col">
                    {canClaimDemo ? (
                        <Button
                            onClick={handleClaimDemo}
                            disabled={isClaiming}
                            className="w-full bg-green-600 hover:bg-green-700"
                        >
                            <Gift className="mr-2 h-4 w-4" />
                            {isClaiming ? "Активация..." : "Получить демо-доступ (бесплатно)"}
                        </Button>
                    ) : (
                        <Button
                            onClick={() => router.push("/dashboard/billing")}
                            className="w-full"
                        >
                            <CreditCard className="mr-2 h-4 w-4" />
                            Пополнить баланс
                        </Button>
                    )}
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

