/**
 * Streaming Service
 * Refactored to use AiGateway (Vercel AI SDK) instead of direct Anthropic SDK.
 * This ensures billing and centralized logging.
 */

import { AiGateway } from "@/lib/services/ai-gateway"
import { CHAT_MODEL, ClaudeMessage } from "./ChatService"

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
    tools?: Record<string, any>
    maxSteps?: number
    onFinish?: (text: string, usage: { input_tokens: number; output_tokens: number }) => Promise<void>
}

// ==========================================
// Streaming Functions
// ==========================================

export async function createChatStream(options: StreamingOptions) {
    // Transform ClaudeMessage (role, content) to Vercel AI SDK CoreMessage if needed,
    // but AiGateway handles 'messages' array. Since we use `streamText` from `ai`,
    // it expects [{role, content}]. ClaudeMessage structure should be compatible.

    // Note: AiGateway enforces model, so options.model is ignored/overridden there.
    return await AiGateway.streamCompletion({
        model: options.model || CHAT_MODEL, // Pass it, but Gateway overrides it
        messages: options.messages,
        userId: options.userId,
        system: options.systemPrompt,
        temperature: options.thinkingBudget ? 1.0 : undefined, // Check if thinking requires temp 1
        tools: options.tools,
        maxSteps: options.maxSteps,
        onFinish: options.onFinish
    })
}

/**
 * Adapter to return a Response from Vercel AI SDK stream.
 * In original code this constructed a ReadableStream manually.
 * Vercel AI SDK `toTextStreamResponse` does this automatically.
 */
export function createStreamingResponse(
    streamResult: any, // Awaited result from streamText
    chatId: string,
    onSaveMessage: (response: string, usage: { input_tokens: number; output_tokens: number }) => Promise<void>
): Response {

    // We can hook into the stream to save message, BUT `streamText` result 
    // already has `onFinish` callback support which we should have used in `createChatStream`.
    // However, the `route.ts` calls `createChatStream` then `createStreamingResponse`.
    // It passes `onSaveMessage` to THIS function.

    // Problem: `streamResult` is already created. We can't attach onFinish easily to the result object itself 
    // without using `streamText` options.

    // Solution: We should move `createChatStream` logic partly here OR
    // just use `.toTextStreamResponse()` and assume `AiGateway` handled the saving?
    // But `AiGateway` is generic. It doesn't know about `saveAssistantMessage`.

    // Correct approach with Vercel AI SDK:
    // The `streamText` result object allows `.toTextStreamResponse()`.
    // To implement `onSaveMessage` (which saves to DB), we should have passed it to `createChatStream`.

    // Refactoring strategy:
    // The route.ts calling pattern is:
    // const stream = await createChatStream(...)
    // return createStreamingResponse(stream, ..., callback)

    // We will change `createChatStream` to ACCEPT the callback if possible, or 
    // since we can't change route.ts signature easily without editing it too (which we plan to do),
    // let's assume we modify route.ts to pass callback EARLIER.

    // BUT, for now, to minimize changes in route.ts logic structure (step-by-step),
    // we can use `streamResult.toTextStreamResponse()` directly.

    // Wait, how do we trigger `onSaveMessage`?
    // Vercel AI SDK `streamText` executes `onFinish` internally when stream ends.
    // If we didn't pass it in `createChatStream`, it won't run.

    // So we MUST modify `createChatStream` to accept `onFinish`.
    // But `route.ts` calls `createChatStream` BEFORE it defines `createStreamingResponse` callback.

    // Let's modify `route.ts` to pass the callback to `createChatStream`.

    // Use toUIMessageStreamResponse for reasoning support
    // Note: toDataStreamResponse breaks frontend compatibility
    return streamResult.toUIMessageStreamResponse({ sendReasoning: true });
}
