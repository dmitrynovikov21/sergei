"use client"

import { useTransition } from "react"
import { seedDefaultAgents } from "@/actions/seed"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Icons } from "@/components/shared/icons"

interface SeedButtonProps extends React.ComponentProps<typeof Button> {
    text?: string
}

export function SeedButton({ text = "Populate Starter Agents", className, ...props }: SeedButtonProps) {
    const [isPending, startTransition] = useTransition()

    const onClick = () => {
        startTransition(async () => {
            try {
                await seedDefaultAgents()
                toast.success("Starter agents created successfully!")
            } catch (error) {
                toast.error("Failed to seed agents")
            }
        })
    }

    return (
        <Button onClick={onClick} disabled={isPending} className={className} {...props}>
            {isPending ? (
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
            ) : (
                <Icons.bot className="mr-2 h-4 w-4" />
            )}
            {text}
        </Button>
    )
}
