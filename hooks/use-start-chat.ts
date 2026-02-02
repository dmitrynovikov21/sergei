import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { createChat } from "@/actions/chat"
import { toast } from "sonner"

interface StartChatOptions {
    datasetId?: string
    initialMessage?: string
    attachments?: any[]
}

export function useStartChat() {
    const [isPending, startTransition] = useTransition()
    const router = useRouter()

    const startChat = (agentId: string, options: StartChatOptions = {}) => {
        startTransition(async () => {
            try {
                // If datasetId is not provided, try to get from localStorage context
                // This preserves the user's "selected dataset" preference
                const effectiveDatasetId = options.datasetId || window.localStorage.getItem("global_dataset_context") || undefined

                console.log("[useStartChat] Creating chat for agent:", agentId, "dataset:", effectiveDatasetId)

                const chatId = await createChat(agentId, undefined, effectiveDatasetId)

                if (chatId) {
                    // Handle attachments if present
                    if (options.attachments && options.attachments.length > 0) {
                        try {
                            sessionStorage.setItem(`chat_attachments_${chatId}`, JSON.stringify(options.attachments))
                        } catch (e) {
                            console.error("Failed to store attachments", e)
                        }
                    }

                    router.refresh() // Update sidebar

                    // Construct URL
                    let url = `/dashboard/chat/${chatId}`
                    if (options.initialMessage) {
                        url += `?init=${encodeURIComponent(options.initialMessage)}`
                    }

                    router.push(url)
                }
            } catch (error) {
                console.error("Failed to start chat", error)
                toast.error("Не удалось создать чат")
            }
        })
    }

    return {
        startChat,
        isPending
    }
}
