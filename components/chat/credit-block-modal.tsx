"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, CreditCard } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { getBlockingStatus } from "@/actions/credits"

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

    useEffect(() => {
        if (isOpen) {
            getBlockingStatus().then((res) => {
                if (!("error" in res)) {
                    setStatus(res)
                }
            })
        }
    }, [isOpen])

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                        <AlertTriangle className="h-6 w-6 text-destructive" />
                    </div>
                    <DialogTitle className="text-center">
                        Недостаточно кредитов
                    </DialogTitle>
                    <DialogDescription className="text-center">
                        Ваш баланс ({status?.balanceFormatted ?? "..."}) опустился ниже минимального порога ({status?.thresholdFormatted ?? "..."}).
                        Пожалуйста, пополните баланс для продолжения использования AI.
                    </DialogDescription>
                </DialogHeader>

                <div className="rounded-lg border bg-muted/50 p-4 text-center">
                    <p className="text-sm text-muted-foreground mb-1">Текущий баланс</p>
                    <p className="text-2xl font-bold text-destructive">
                        {status?.balanceFormatted ?? "..."}
                    </p>
                </div>

                <DialogFooter className="flex-col gap-2 sm:flex-col">
                    <Button
                        onClick={() => router.push("/dashboard/billing")}
                        className="w-full"
                    >
                        <CreditCard className="mr-2 h-4 w-4" />
                        Пополнить баланс
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
