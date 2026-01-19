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
        const { message, attachments } = await req.json()
        if ((!message || typeof message !== "string") && (!attachments || attachments.length === 0)) {
            return new Response("Message or attachment is required", { status: 400 })
        }

        // 3. Get chat with agent and messages
        const chat = await getChatWithContext(params.chatId)

        if (!chat || chat.userId !== session.user.id) {
            return new Response("Chat not found", { status: 404 })
        }

        // 4. Build system prompt with all context
        let datasetContext: string | null = null
        if (chat.datasetId) {
            datasetContext = await getDatasetContext(chat.datasetId)
        }
        const systemPrompt = buildSystemPrompt(chat.agent, datasetContext)

        // 5. Prepare messages for Claude API
        const claudeMessages = prepareClaudeMessages(chat.messages, message, attachments, chat.agent.files)

        // 6. Save user message to DB
        await saveUserMessage(params.chatId, message, attachments)

        // 7. Generate title for first message
        if (chat.messages.length === 0) {
            const titlePrompt = message || (attachments && attachments.length > 0 ? "Analyzed file" : "New Chat")
            generateAndSaveChatTitle(params.chatId, titlePrompt) // Fire-and-forget
        }

        // 8. Create streaming response
        const stream = await createChatStream({
            systemPrompt,
            messages: claudeMessages,
            userId: session.user.id,
        })

        // 9. Return streaming response with save callback
        return createStreamingResponse(
            stream,
            params.chatId,
            (response, usage) => saveAssistantMessage(params.chatId, response, usage)
        )

    } catch (error) {
        console.error("[Chat API] Error:", error)
        return new Response(
            error instanceof Error ? error.message : "Internal server error",
            { status: 500 }
        )
    }
}
