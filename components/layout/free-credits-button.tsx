"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Gift, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip"

interface FreeCreditsButtonProps {
    isExpanded: boolean
}

export function FreeCreditsButton({ isExpanded }: FreeCreditsButtonProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [claimed, setClaimed] = useState(true) // Start hidden, show only if not claimed
    const [isChecking, setIsChecking] = useState(true)

    // Check if already claimed on mount
    useEffect(() => {
        const checkClaimed = async () => {
            try {
                const res = await fetch('/api/payments/free-test/check')
                const data = await res.json()
                setClaimed(data.claimed === true)
            } catch {
                setClaimed(false) // Show button on error
            } finally {
                setIsChecking(false)
            }
        }
        checkClaimed()
    }, [])

    const handleClaim = async () => {
        setIsLoading(true)
        try {
            const res = await fetch('/api/payments/free-test', { method: 'POST' })
            const data = await res.json()

            if (!res.ok) {
                if (data.error?.includes('Уже получены')) {
                    setClaimed(true)
                    toast.info("Вы уже получили бесплатные кредиты")
                } else {
                    throw new Error(data.error)
                }
                return
            }

            toast.success(`🎁 Получено ${data.credits} бесплатных кредитов!`)
            setClaimed(true)
            // Refresh page to update credits display
            setTimeout(() => window.location.reload(), 1000)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Ошибка")
        } finally {
            setIsLoading(false)
        }
    }

    // Don't show while checking or if already claimed
    if (isChecking || claimed) return null

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    onClick={handleClaim}
                    disabled={isLoading}
                    variant="outline"
                    className={cn(
                        "w-full border-white/10 hover:bg-white/5",
                        "transition-all duration-200",
                        !isExpanded && "px-2"
                    )}
                >
                    {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Gift className="h-4 w-4" />
                    )}
                    {isExpanded && (
                        <span className="ml-2">
                            {isLoading ? "Активация..." : "🎁 100 кредитов"}
                        </span>
                    )}
                </Button>
            </TooltipTrigger>
            {!isExpanded && (
                <TooltipContent side="right">
                    Получить 100 бесплатных кредитов
                </TooltipContent>
            )}
        </Tooltip>
    )
}
