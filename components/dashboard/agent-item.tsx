"use client"

import { Agent } from "@prisma/client"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { createChat } from "@/actions/chat"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    CardFooter
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Icons } from "@/components/shared/icons"
import { cn } from "@/lib/utils"

interface AgentItemProps {
    agent: Agent
}

export function AgentItem({ agent }: AgentItemProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()

    const onStartChat = () => {
        startTransition(async () => {
            try {
                // Read datasetId from localStorage (set by ContextSelector)
                const datasetId = localStorage.getItem("global_dataset_context") || undefined
                console.log("[AgentItem] Creating chat with datasetId:", datasetId)
                const chatId = await createChat(agent.id, undefined, datasetId)
                router.refresh() // Update sidebar with new chat
                router.push(`/dashboard/chat/${chatId}`)
            } catch (error) {
                console.error("Failed to start chat", error)
            }
        })
    }

    return (
        <Card
            className={cn("cursor-pointer transition-colors hover:bg-muted/50", isPending && "opacity-50")}
            onClick={onStartChat}
        >
            <CardHeader className="pb-3">
                <CardTitle>{agent.name}</CardTitle>
                <CardDescription>{agent.description}</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="line-clamp-3 text-sm text-muted-foreground">
                    {agent.systemPrompt}
                </p>
            </CardContent>
            {/* We can hide footer or keep settings button, but make sure click doesn't trigger chat */}
        </Card>
    )
}
