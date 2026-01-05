"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Icons } from "@/components/shared/icons"

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error(error)
    }, [error])

    return (
        <div className="flex h-full w-full items-center justify-center p-8">
            <div className="flex max-w-md flex-col items-center text-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <Icons.warning className="h-8 w-8 text-zinc-500" />
                </div>
                <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">
                    Ошибка чата
                </h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {error.message || "Не удалось загрузить этот чат."}
                </p>
                <Button onClick={() => reset()} variant="outline">
                    Попробовать снова
                </Button>
            </div>
        </div>
    )
}
