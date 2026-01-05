import Anthropic from "@anthropic-ai/sdk"

if (!process.env.ANTHROPIC_API_KEY) {
    console.warn("Warning: ANTHROPIC_API_KEY is not set in environment variables")
}

export const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY || "",
})

// Default model to use
export const DEFAULT_MODEL = "claude-sonnet-4-20250514"

// Available models
export const CLAUDE_MODELS = {
    "claude-3-5-sonnet": "claude-sonnet-4-20250514",
    "claude-3-opus": "claude-3-opus-20240229",
    "claude-3-haiku": "claude-3-haiku-20240307",
} as const

export type ClaudeModel = keyof typeof CLAUDE_MODELS
