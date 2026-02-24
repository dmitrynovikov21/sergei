import { generateText, streamText, LanguageModel } from 'ai';
import { prisma } from '@/lib/db';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { CreditManager } from './credit-manager';
import { v4 as uuidv4 } from 'uuid';

// --- PRICING CONFIG ---
const MODEL_COSTS_PER_1M: Record<string, { input: number; output: number }> = {
    'claude-sonnet-4-6': { input: 3.0, output: 15.0 },
    'claude-sonnet-4-5-20250929': { input: 3.0, output: 15.0 },
    'claude-3-5-sonnet-20240620': { input: 3.0, output: 15.0 },
    'claude-3-opus-20240229': { input: 15.0, output: 75.0 },
    'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
    'gpt-4o': { input: 5.0, output: 15.0 },
    'gpt-4o-mini': { input: 0.15, output: 0.60 },
    'gemini-3-pro-preview': { input: 1.25, output: 10.0 },
};

const DEFAULT_COST_PER_1M = { input: 1.0, output: 1.0 };

import { ClaudeMessage } from './chat/ChatService';

interface TokenUsage {
    input_tokens: number;
    output_tokens: number;
}

interface AiRequestParams {
    model: string;
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

/** Check if error is 529 overloaded */
function isOverloadError(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;
    const err = error as any;
    if (err.statusCode === 529) return true;
    if (err.cause?.statusCode === 529) return true;
    if (typeof err.responseBody === 'string' && err.responseBody.includes('overloaded')) return true;
    if (err.message?.includes('529') || err.message?.toLowerCase()?.includes('overloaded')) return true;
    if (err.cause && isOverloadError(err.cause)) return true;
    return false;
}

export class AiGateway {
    private static readonly PRIMARY_MODEL = 'claude-sonnet-4-6';
    private static readonly FALLBACK_MODEL = 'gemini-3-pro-preview';

    /**
     * Non-streaming completion with billing.
     */
    static async generateCompletion(params: AiRequestParams) {
        const modelToUse = this.PRIMARY_MODEL;
        const { messages, userId, system, temperature, context } = params;
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
     * Streaming completion with billing.
     * Primary: Claude. On 529 overload → fallback to Gemini 2.5 Pro with thinking.
     */
    static async streamCompletion(params: AiRequestParams) {
        console.log(`[AiGateway] streamCompletion: primary=${this.PRIMARY_MODEL}, fallback=${this.FALLBACK_MODEL}`);

        const isBlocked = await CreditManager.isBlocked(params.userId);
        if (isBlocked) throw new Error('CREDITS_BLOCKED');

        // Quick health-check: 1-token generateText to detect 529 before committing to stream
        let useFallback = false;
        try {
            const { provider, modelInstance } = this.resolveModel(this.PRIMARY_MODEL);
            await generateText({
                model: modelInstance,
                messages: [{ role: 'user' as const, content: 'hi' }],
                maxRetries: 0,
            } as any);
        } catch (error) {
            if (isOverloadError(error) && process.env.GEMINI_API_KEY) {
                console.warn(`[AiGateway] ⚠️ Claude 529 overloaded → switching to Gemini 3 Pro`);
                useFallback = true;
            } else {
                throw error;
            }
        }

        const model = useFallback ? this.FALLBACK_MODEL : this.PRIMARY_MODEL;
        const tag = useFallback ? 'gemini-fallback' : 'primary';
        return this.buildStream(model, params, tag);
    }

    // --- BUILD STREAM ---

    private static buildStream(
        modelStr: string,
        params: AiRequestParams,
        tag: string,
        maxRetries?: number
    ) {
        const { messages, userId, system, temperature } = params;
        const { provider, modelName, modelInstance } = this.resolveModel(modelStr);

        console.log(`[AiGateway] buildStream [${tag}]: ${provider}/${modelName}`);

        const isAnthropic = provider === 'anthropic';
        const isGoogle = provider === 'google';

        return streamText({
            model: modelInstance,
            messages: messages as any,
            system,
            temperature: isAnthropic ? 1 : temperature,
            maxRetries,
            // Extended thinking: Anthropic uses providerOptions, Google uses native thinking
            providerOptions: isAnthropic ? {
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
                        context: { ...(params.context as any), route: tag },
                    });
                } catch (logError) {
                    console.error("[AiGateway] Failed to log transaction:", logError);
                }

                if (params.onFinish) {
                    try {
                        await params.onFinish(text, { input_tokens: inputTokens, output_tokens: outputTokens });
                    } catch (saveError) {
                        console.error("[AiGateway] Failed onFinish callback:", saveError);
                    }
                }
            },
        });
    }

    // --- MODEL RESOLVER ---

    private static resolveModel(modelStr: string): { provider: string; modelName: string; modelInstance: LanguageModel } {
        // Gemini
        if (modelStr.includes('gemini') && process.env.GEMINI_API_KEY) {
            const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });
            return { provider: 'google', modelName: modelStr, modelInstance: google(modelStr) };
        }

        // Claude (direct Anthropic)
        if (modelStr.includes('claude')) {
            const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
            return { provider: 'anthropic', modelName: modelStr, modelInstance: anthropic(modelStr) };
        }

        // LiteLLM fallback
        if (!process.env.LITELLM_API_URL) {
            throw new Error("LITELLM_API_URL is missing.");
        }
        const litellm = createOpenAI({
            baseURL: `${process.env.LITELLM_API_URL}/v1`,
            apiKey: process.env.LITELLM_MASTER_KEY || "sk-litellm-master-key",
        });
        return { provider: 'litellm', modelName: modelStr, modelInstance: litellm(modelStr) };
    }

    // --- BILLING ---

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
            const tx = await (prisma as any).tokenTransaction.create({
                data: {
                    id: uuidv4(),
                    userId, provider, model,
                    inputTokens, outputTokens, totalCost,
                    context: context ? JSON.stringify(context) : null,
                },
            });

            const costCredits = CreditManager.costToCredits(totalCost);
            if (costCredits > 0) {
                await CreditManager.deductCredits(userId, costCredits, "ai-completion", {
                    tokenTransactionId: tx.id, model
                });
            }

            console.log(`[AiGateway] ✅ ${model} [${provider}] | in:${inputTokens} out:${outputTokens} | $${totalCost.toFixed(6)} (${costCredits} cr)`);
            return tx;
        } catch (err) {
            console.error('[AiGateway] ❌ Failed to log transaction:', err);
        }
    }
}
