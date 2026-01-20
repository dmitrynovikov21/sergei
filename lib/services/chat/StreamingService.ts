/**
 * Streaming Service
 * 
 * Handles:
 * - Creating streaming response from Anthropic
 * - Processing stream events
 * - Managing response lifecycle
 */

import Anthropic from "@anthropic-ai/sdk"
import { CHAT_MODEL, CHAT_MAX_TOKENS, THINKING_BUDGET, ClaudeMessage } from "./ChatService"

// ==========================================
// Types
// ==========================================

export interface StreamingOptions {
    model?: string
    maxTokens?: number
    systemPrompt: string
    messages: ClaudeMessage[]
    userId: string
    thinkingBudget?: number
}

export interface StreamingCallbacks {
    onText: (text: string) => void
    onComplete: (fullResponse: string, usage: { input_tokens: number; output_tokens: number }) => Promise<void>
    onError: (error: Error, partialResponse: string) => Promise<void>
}

// ==========================================
// Anthropic Client (Singleton)
// ==========================================

let anthropicClient: Anthropic | null = null

export function getAnthropicClient(): Anthropic {
    if (!anthropicClient) {
        anthropicClient = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY,
        })
    }
    return anthropicClient
}

// ==========================================
// Streaming Functions
// ==========================================

export async function createChatStream(options: StreamingOptions) {
    const client = getAnthropicClient()

    const messagingOptions: any = {
        model: options.model || CHAT_MODEL,
        max_tokens: options.maxTokens || CHAT_MAX_TOKENS,
        system: options.systemPrompt,
        messages: options.messages,
        metadata: { user_id: options.userId },
        // Note: temperature must be 1 when thinking is enabled (Claude API requirement)
        thinking: {
            type: "enabled",
            budget_tokens: options.thinkingBudget || THINKING_BUDGET
        }
    }

    console.log("-----------------------------------------")
    console.log("[StreamingService] Using Model:", messagingOptions.model)
    console.log("[StreamingService] System Prompt Length:", options.systemPrompt.length)
    console.log("-----------------------------------------")

    return client.messages.stream(messagingOptions)
}

export function createStreamingResponse(
    stream: ReturnType<typeof createChatStream> extends Promise<infer T> ? T : never,
    chatId: string,
    onSaveMessage: (response: string, usage: { input_tokens: number; output_tokens: number }) => Promise<void>
): Response {
    const encoder = new TextEncoder()
    let fullResponse = ""
    let messageSaved = false

    const saveMessage = async (response: string, usage: { input_tokens: number; output_tokens: number }) => {
        if (messageSaved) return
        messageSaved = true
        await onSaveMessage(response, usage)
    }

    const readable = new ReadableStream({
        async start(controller) {
            try {
                for await (const event of stream) {
                    // Only stream the final text response, thinking is processed internally
                    if (event.type === "content_block_delta") {
                        const delta = event.delta as any
                        if (delta.type === "text_delta" && delta.text) {
                            fullResponse += delta.text
                            controller.enqueue(encoder.encode(delta.text))
                        }
                    }
                }

                // After streaming completes, save assistant message
                const finalMessage = await stream.finalMessage()
                await saveMessage(fullResponse, finalMessage.usage)

                controller.close()
            } catch (error) {
                console.error("[StreamingService] Stream error:", error)

                // Even on error, try to save partial response if we have any
                if (fullResponse.length > 0 && !messageSaved) {
                    console.log(`[StreamingService] Stream interrupted, saving partial response (${fullResponse.length} chars)`)
                    await saveMessage(fullResponse, { input_tokens: 0, output_tokens: 0 })
                }

                controller.error(error)
            }
        },

        // This is called when the client disconnects
        cancel: async () => {
            console.log(`[StreamingService] Client disconnected from chat ${chatId}`)

            // Save whatever we have so far
            if (fullResponse.length > 0 && !messageSaved) {
                console.log(`[StreamingService] Saving response on disconnect (${fullResponse.length} chars)`)
                await saveMessage(fullResponse, { input_tokens: 0, output_tokens: 0 })
            }
        }
    })

    return new Response(readable, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no", // Disable buffering in Nginx/Cloudflare
        },
    })
}
