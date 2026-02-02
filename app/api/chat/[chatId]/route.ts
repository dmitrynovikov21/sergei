/**
 * Chat API Route
 * 
 * POST /api/chat/[chatId]
 * Handles chat message submission and AI response streaming.
 * 
 * Refactored to use ChatService and StreamingService.
 */

import { NextRequest } from "next/server"
import { auth } from "@/auth"
import { getDatasetContext } from "@/actions/datasets"
import {
    getChatWithContext,
    buildSystemPrompt,
    prepareClaudeMessages,
    saveUserMessage,
    saveAssistantMessage,
    generateAndSaveChatTitle,
} from "@/lib/services/chat"
import {
    createChatStream,
    createStreamingResponse,
} from "@/lib/services/chat"
import { checkAgentAccess } from "@/lib/subscription-guard"

export const runtime = "nodejs"
export const maxDuration = 300 // Allow up to 300 seconds for streaming

export async function POST(
    req: NextRequest,
    { params }: { params: { chatId: string } }
) {
    try {
        // 1. Auth check
        const session = await auth()
        if (!session?.user?.id) {
            return new Response("Unauthorized", { status: 401 })
        }

        // 2. Parse request
        const { message, attachments, datasetId: requestDatasetId } = await req.json()
        if ((!message || typeof message !== "string") && (!attachments || attachments.length === 0)) {
            return new Response("Message or attachment is required", { status: 400 })
        }

        // 3. Get chat with agent and messages
        const chat = await getChatWithContext(params.chatId)

        if (!chat || chat.userId !== session.user.id) {
            return new Response("Chat not found", { status: 404 })
        }

        // 4. CHECK SUBSCRIPTION ACCESS
        const accessResult = await checkAgentAccess(session.user.id, chat.agent.name)

        if (!accessResult.hasAccess) {
            console.log(`[Chat API] Access denied for user ${session.user.id} to agent ${chat.agent.name}:`, accessResult.error)

            if (accessResult.error?.startsWith('SUBSCRIPTION_REQUIRED')) {
                return new Response(JSON.stringify({
                    error: 'SUBSCRIPTION_REQUIRED',
                    requiredPlan: accessResult.requiredPlan,
                    message: `Для использования этого агента нужна подписка "${accessResult.requiredPlan === 'reels' ? 'Reels' : 'Карусели'}"`
                }), {
                    status: 403,
                    headers: { 'Content-Type': 'application/json' }
                })
            }

            if (accessResult.error === 'CREDITS_EXHAUSTED') {
                return new Response(JSON.stringify({
                    error: 'CREDITS_EXHAUSTED',
                    requiredPlan: accessResult.requiredPlan,
                    message: 'Лимит кредитов исчерпан. Дождитесь обновления или купите дополнительный пакет.'
                }), {
                    status: 402,
                    headers: { 'Content-Type': 'application/json' }
                })
            }
        }

        // 5. Build system prompt with all context
        let datasetContext: string | null = null
        // PRIORITY: requestDatasetId (from chat input selector) > agent.datasetId > chat.datasetId
        const effectiveDatasetId = requestDatasetId || chat.agent.datasetId || chat.datasetId
        console.log("[Chat API] requestDatasetId:", requestDatasetId, "agent.datasetId:", chat.agent.datasetId, "chat.datasetId:", chat.datasetId, "=> using:", effectiveDatasetId)
        if (effectiveDatasetId) {
            datasetContext = await getDatasetContext(effectiveDatasetId)
            console.log("[Chat API] Dataset context loaded, length:", datasetContext?.length || 0)
        } else {
            console.log("[Chat API] No dataset configured for chat or agent")
        }
        const systemPrompt = buildSystemPrompt(chat.agent, datasetContext)

        // 6. Prepare messages for Claude API
        const claudeMessages = prepareClaudeMessages(chat.messages, message, attachments, chat.agent.files)

        // 7. Save user message to DB
        await saveUserMessage(params.chatId, message, attachments)

        // 8. Generate title for first message
        if (chat.messages.length === 0) {
            const titlePrompt = message || (attachments && attachments.length > 0 ? "Analyzed file" : "New Chat")
            generateAndSaveChatTitle(params.chatId, titlePrompt) // Fire-and-forget
        }

        // 9. Create streaming response via AiGateway
        // Pass subscription info for credit deduction
        const streamResponse = await createChatStream({
            systemPrompt,
            messages: claudeMessages,
            userId: session.user.id,
            subscriptionId: accessResult.subscription?.id,
            onFinish: async (response, usage) => {
                await saveAssistantMessage(params.chatId, response, usage)
            }
        } as any)

        // 10. Return streaming response
        return createStreamingResponse(
            streamResponse,
            params.chatId,
            async () => { } // Callback handled in createChatStream onFinish
        )

    } catch (error) {
        console.error("[Chat API] Error:", error)

        // Handle credits blocked error
        if (error instanceof Error && error.message === 'CREDITS_BLOCKED') {
            return new Response(JSON.stringify({
                error: 'CREDITS_BLOCKED',
                message: 'Недостаточно кредитов. Пожалуйста, пополните баланс.'
            }), {
                status: 402, // Payment Required
                headers: { 'Content-Type': 'application/json' }
            })
        }

        return new Response(
            error instanceof Error ? error.message : "Internal server error",
            { status: 500 }
        )
    }
}

