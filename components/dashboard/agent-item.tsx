"use client"

import { Agent } from "@prisma/client"
import { useStartChat } from "@/hooks/use-start-chat"
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
    const { startChat, isPending } = useStartChat()

    const onStartChat = () => {
        startChat(agent.id)
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
