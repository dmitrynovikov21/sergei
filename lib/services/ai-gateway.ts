import { generateText, streamText, LanguageModel } from 'ai';
import { prisma } from '@/lib/db';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { CreditManager } from './credit-manager';
import { v4 as uuidv4 } from 'uuid';

// --- PRICING CONFIG ---
const MODEL_COSTS_PER_1M: Record<string, { input: number; output: number }> = {
    // Anthropic
    'claude-3-5-sonnet-20240620': { input: 3.0, output: 15.0 },
    'claude-3-opus-20240229': { input: 15.0, output: 75.0 },
    'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
    'claude-sonnet-4-5-20250929': { input: 3.0, output: 15.0 }, // $3 input, $15 output per 1M tokens
    'gpt-4o': { input: 5.0, output: 15.0 },
    'gpt-4o-mini': { input: 0.15, output: 0.60 },
};

const DEFAULT_COST_PER_1M = { input: 1.0, output: 1.0 };

import { ClaudeMessage } from './chat/ChatService';

// Usage type for onFinish callback (matches ChatService expectations)
interface TokenUsage {
    input_tokens: number;
    output_tokens: number;
}

interface AiRequestParams {
    model: string;
    // Using unknown[] for SDK compatibility - actual type is ClaudeMessage[]
    messages: unknown[];
    userId: string;
    system?: string;
    temperature?: number;
    maxOutputTokens?: number;
    tools?: Record<string, unknown>;
    maxSteps?: number;
    context?: Record<string, unknown>;
    onFinish?: (text: string, usage: TokenUsage) => Promise<void>;
}

export class AiGateway {
    // Enforced model for all client requests
    private static readonly ENFORCED_MODEL = 'claude-sonnet-4-5-20250929';

    /**
     * Non-streaming completion with billing.
     */
    static async generateCompletion(params: AiRequestParams) {
        // OVERRIDE: Enforce specific model
        const modelToUse = this.ENFORCED_MODEL;
        const { messages, userId, system, temperature, context } = params;

        // Resolve using ONLY LiteLLM
        const { provider, modelName, modelInstance } = this.resolveModel(modelToUse);

        const result = await generateText({
            model: modelInstance,
            messages,
            system,
            temperature,
        } as any);

        await this.logTransaction({
            userId,
            provider,
            model: modelName,
            inputTokens: (result.usage as any)?.inputTokens ?? (result.usage as any)?.promptTokens ?? 0,
            outputTokens: (result.usage as any)?.outputTokens ?? (result.usage as any)?.completionTokens ?? 0,
            context,
        });

        return result;
    }

    /**
     * Streaming completion with billing (logged after stream ends).
     * Returns the streamText result directly for .toTextStreamResponse() etc.
     */
    static async streamCompletion(params: AiRequestParams) {
        // OVERRIDE: Enforce specific model
        const modelToUse = this.ENFORCED_MODEL;
        console.log(`[AiGateway] streamCompletion START: Enforced ${modelToUse} (was ${params.model}) for ${params.userId}`);

        const { messages, userId, system, temperature, tools, maxSteps, context } = params;

        try {
            // Check if user is blocked before making AI request
            const isBlocked = await CreditManager.isBlocked(userId);
            if (isBlocked) {
                throw new Error('CREDITS_BLOCKED');
            }

            const { provider, modelName, modelInstance } = this.resolveModel(modelToUse);

            const result = streamText({
                model: modelInstance,
                messages: messages as any,
                system,
                temperature: provider === 'anthropic' ? 1 : temperature, // Thinking requires temperature 1
                // No tools - dataset context is passed in system prompt
                // Enable extended thinking for Claude models
                providerOptions: provider === 'anthropic' ? {
                    anthropic: {
                        thinking: { type: 'enabled', budgetTokens: 4000 }
                    }
                } : undefined,
                onFinish: async ({ usage, text }) => {
                    const inputTokens = (usage as any)?.inputTokens ?? (usage as any)?.promptTokens ?? 0;
                    const outputTokens = (usage as any)?.outputTokens ?? (usage as any)?.completionTokens ?? 0;

                    try {
                        await this.logTransaction({
                            userId,
                            provider,
                            model: modelName,
                            inputTokens,
                            outputTokens,
                            context,
                        });
                    } catch (logError) {
                        console.error("[AiGateway] Failed to log transaction in onFinish:", logError);
                    }

                    // Call external onFinish callback (e.g., saveAssistantMessage)
                    if (params.onFinish) {
                        try {
                            await params.onFinish(text, {
                                input_tokens: inputTokens,
                                output_tokens: outputTokens
                            });
                        } catch (saveError) {
                            console.error("[AiGateway] Failed to call onFinish callback:", saveError);
                        }
                    }
                },
            });

            return result;

        } catch (error) {
            console.error("[AiGateway] CRITICAL ERROR in streamCompletion:", error);
            throw error;
        }
    }

    // --- PRIVATE HELPERS ---

    private static resolveModel(modelStr: string): { provider: string; modelName: string; modelInstance: LanguageModel } {
        // STRICT LITELLM ENFORCEMENT
        if (!process.env.LITELLM_API_URL) {
            throw new Error("LITELLM_API_URL is missing. Critical error: AiGateway requires LiteLLM.");
        }

        // For Claude models, use direct Anthropic provider to support extended thinking
        if (modelStr.includes('claude')) {
            const anthropic = createAnthropic({
                apiKey: process.env.ANTHROPIC_API_KEY,
            });
            return {
                provider: 'anthropic',
                modelName: modelStr,
                modelInstance: anthropic(modelStr)
            };
        }

        // For other models, use LiteLLM
        const litellm = createOpenAI({
            baseURL: `${process.env.LITELLM_API_URL}/v1`,
            apiKey: process.env.LITELLM_MASTER_KEY || "sk-litellm-master-key",
        });

        return {
            provider: 'litellm',
            modelName: modelStr,
            modelInstance: litellm(modelStr)
        };
    }

    private static async logTransaction(data: {
        userId: string;
        provider: string;
        model: string;
        inputTokens: number;
        outputTokens: number;
        context?: Record<string, unknown>;
    }) {
        const { userId, provider, model, inputTokens, outputTokens, context } = data;

        const pricing = MODEL_COSTS_PER_1M[model] || DEFAULT_COST_PER_1M;
        const totalCost = (inputTokens / 1_000_000) * pricing.input + (outputTokens / 1_000_000) * pricing.output;

        try {
            // 1. Log Token Transaction
            const tx = await (prisma as any).tokenTransaction.create({
                data: {
                    id: uuidv4(),
                    userId,
                    provider,
                    model,
                    inputTokens,
                    outputTokens,
                    totalCost,
                    context: context ? JSON.stringify(context) : null,
                },
            });

            // 2. Deduct Credits
            const costCredits = CreditManager.costToCredits(totalCost);
            if (costCredits > 0) {
                await CreditManager.deductCredits(userId, costCredits, "ai-completion", {
                    tokenTransactionId: tx.id,
                    model
                });
            }

            console.log(`[AiGateway] ✅ Logged: ${model} | in:${inputTokens} out:${outputTokens} | $${totalCost.toFixed(6)} (${costCredits} cr)`);
            return tx;
        } catch (err) {
            console.error('[AiGateway] ❌ Failed to log transaction:', err);
        }
    }
}

