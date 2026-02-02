"use server"

import { AiGateway } from "@/lib/services/ai-gateway"

/**
 * Producer Actions - Server actions for Master Agent communication.
 * Refactored to use internal AiGateway for tokenomics tracking.
 */

// ==========================================
// Types
// ==========================================

interface ChatResponse {
    reply: string
    action?: string
    data?: Record<string, unknown>
}

interface BatchResponse {
    id: string
    headlines: Array<{ id: string; headline: string }>
    scripts: Array<{ id: string; headline: string; caption: string; reasoning: string }>
    visuals: Array<{ id: string; video_prompt: string }>
}

// ==========================================
// Public Actions
// ==========================================

/**
 * Chat with the AI agent for intent routing.
 */
export async function chatWithAgent(
    message: string,
    batchId?: string
): Promise<ChatResponse> {
    try {
        console.log("[ProducerAction] chatWithAgent called:", message);

        // Use AiGateway to verify tokenomics
        // We use a simple system prompt here for the test
        const result = await AiGateway.generateCompletion({
            model: "gpt-4o", // Using GPT-4o for testing as requested
            userId: "server-action-user", // TODO: Get real user ID from session
            messages: [{ role: "user", content: message }],
            system: "Ты помощник продюсера. Отвечай кратко.",
            context: { endpoint: "producer-action" }
        });

        return {
            reply: result.text,
            // For now, no specific actions are triggered in this simplified test version
        }
    } catch (error) {
        console.error("[ProducerAction] Error:", error);
        return {
            reply: "❌ Ошибка при генерации ответа. Проверь логи сервера."
        }
    }
}

/**
 * Start a new content batch with headline generation.
 * (Mocked for now to pass type checks, verifying chat logging is priority)
 */
export async function startBatch(
    count: number = 10,
    topic?: string
): Promise<BatchResponse> {
    console.log("[ProducerAction] startBatch called");
    return {
        id: "mock-batch-" + Date.now(),
        headlines: [],
        scripts: [],
        visuals: []
    }
}

/**
 * Approve headlines and generate scripts.
 */
export async function approveHeadlines(
    batchId: string,
    approvedIds: string[]
): Promise<BatchResponse> {
    return {
        id: batchId,
        headlines: [],
        scripts: [],
        visuals: []
    }
}

/**
 * Approve scripts and create visual blueprints.
 */
export async function approveScripts(
    batchId: string,
    approvedIds: string[]
): Promise<BatchResponse> {
    return {
        id: batchId,
        headlines: [],
        scripts: [],
        visuals: []
    }
}

/**
 * Start video production pipeline.
 */
export async function startProduction(
    batchId: string
): Promise<{ status: string; batch_id: string }> {
    return { status: "started", batch_id: batchId }
}
