import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { createChat } from "@/actions/chat"
import { toast } from "sonner"

interface StartChatOptions {
    datasetId?: string
    initialMessage?: string
    attachments?: unknown[]
    useApi?: boolean // Force API route instead of server action
}

export function useStartChat() {
    const [isPending, startTransition] = useTransition()
    const router = useRouter()

    const startChat = (agentId: string, options: StartChatOptions = {}) => {
        startTransition(async () => {
            try {
                const effectiveDatasetId = options.datasetId || window.localStorage.getItem("global_dataset_context") || undefined

                let chatId: string | null = null

                if (options.useApi || options.initialMessage) {
                    // Use API route — deploy-proof, no server action hash issues
                    const res = await fetch("/api/chat/create", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ agentId, datasetId: effectiveDatasetId }),
                    })
                    if (!res.ok) throw new Error("Failed to create chat")
                    const data = await res.json()
                    chatId = data.chatId
                } else {
                    // Server action for normal agent page starts
                    chatId = await createChat(agentId, undefined, effectiveDatasetId)
                }

                if (chatId) {
                    // Store attachments in sessionStorage if present
                    if (options.attachments && options.attachments.length > 0) {
                        try {
                            sessionStorage.setItem(`chat_attachments_${chatId}`, JSON.stringify(options.attachments))
                        } catch (e) {
                            console.error("Failed to store attachments", e)
                        }
                    }

                    // Store initial message in sessionStorage (no URL length limits)
                    if (options.initialMessage) {
                        try {
                            sessionStorage.setItem(`chat_init_${chatId}`, options.initialMessage)
                        } catch (e) {
                            console.error("Failed to store init message", e)
                        }
                    }

                    router.push(`/dashboard/chat/${chatId}`)
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
