"use client"

import Link from "next/link"
import { Chat } from "@prisma/client"
import { formatDistanceToNow } from "date-fns"
import { ru } from "date-fns/locale"
import { Clock } from "lucide-react"

interface AgentChatHistoryProps {
    chats: Chat[]
}

export function AgentChatHistory({ chats }: AgentChatHistoryProps) {
    if (chats.length === 0) {
        return (
            <div className="text-center py-12">
                <Clock className="w-6 h-6 text-zinc-400 mx-auto mb-3" />
                <h3 className="text-zinc-700 dark:text-zinc-300 font-medium mb-1">Нет истории чатов</h3>
                <p className="text-zinc-500 text-sm">Начните новый диалог выше</p>
            </div>
        )
    }

    return (
        <div className="space-y-1">
            {chats.map((chat) => (
                <Link
                    key={chat.id}
                    href={`/dashboard/chat/${chat.id}`}
                    className="block py-3 px-3 -mx-3 border-b border-border/50 last:border-0 hover:bg-muted rounded-lg transition-colors"
                >
                    <p className="text-foreground text-sm font-medium truncate">
                        {chat.title || "Новый чат"}
                    </p>
                    <p className="text-zinc-500 text-xs mt-1">
                        {formatDistanceToNow(new Date(chat.updatedAt), { addSuffix: true, locale: ru })}
                    </p>
                </Link>
            ))}
        </div>
    )
}
