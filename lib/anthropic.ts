import Anthropic from "@anthropic-ai/sdk"

if (!process.env.ANTHROPIC_API_KEY) {
    console.warn("Warning: ANTHROPIC_API_KEY is not set in environment variables")
}

export const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
})

// Default model to use
export const DEFAULT_MODEL = process.env.MODEL_NAME_ANTHROPIC || process.env.CLAUDE_MODEL || "claude-sonnet-4-5"

// Available models
export const CLAUDE_MODELS = {
    "claude-3-5-sonnet": "claude-3-5-sonnet-20241022",
    "claude-4-5-sonnet": "claude-sonnet-4-5-20250929", // Old key -> New model
    "claude-sonnet-4-5": "claude-sonnet-4-5-20250929", // New key
    "claude-3-7-sonnet": "claude-3-7-sonnet-20250219",
    "claude-3-opus": "claude-3-7-sonnet-20250219", // Upgrade Opus users to 3.7 (better logic)
    "claude-3-haiku": "claude-haiku-4-5-20251001", // Upgrade Haiku
} as const

export type ClaudeModel = keyof typeof CLAUDE_MODELS
