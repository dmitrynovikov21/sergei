/**
 * Chat Title Generation with AI
 */

import { anthropic } from "@/lib/anthropic"
import { DEFAULT_MODEL } from "@/lib/anthropic"

export async function generateChatTitle(firstMessage: string): Promise<string> {
    try {
        // Truncate message if too long
        const prompt = firstMessage.slice(0, 500)

        const response = await anthropic.messages.create({
            model: DEFAULT_MODEL,
            max_tokens: 100,
            messages: [{
                role: 'user',
                content: `Generate a very short chat title (max 40 characters) in Russian for this message. Only return the title, nothing else: "${prompt}"`
            }]
        })

        const title = response.content[0].type === 'text'
            ? response.content[0].text.trim()
            : "Новый чат"

        // Ensure it's not too long
        return title.length > 50 ? title.slice(0, 47) + "..." : title
    } catch (error) {
        console.error("Failed to generate chat title:", error)
        return "Новый чат"
    }
}
