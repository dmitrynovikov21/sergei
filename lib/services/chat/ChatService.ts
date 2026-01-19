/**
 * Chat Service
 * 
 * Encapsulates all chat-related business logic:
 * - System prompt building
 * - Message preparation for API
 * - Database operations
 * - AI model configuration
 */

import { prisma } from "@/lib/db"
import { getDatasetContext } from "@/actions/datasets"
import { generateChatTitle } from "@/lib/chat-titles"
import { Agent, Chat, Message, Attachment } from "@prisma/client"

// ==========================================
// Types
// ==========================================

export type ChatWithAgent = Chat & {
    agent: Agent & {
        files: { id: string; name: string; content: string }[]
    }
    messages: (Message & {
        attachments: Attachment[]
    })[]
}

export interface MessageContent {
    type: "text" | "image"
    text?: string
    source?: {
        type: "base64"
        media_type: string
        data: string
    }
}

export interface ClaudeMessage {
    role: "user" | "assistant"
    content: string | MessageContent[]
}

// ==========================================
// Configuration
// ==========================================

// Hardcoded model - all requests use Claude 4.5 Sonnet with Thinking
export const CHAT_MODEL = "claude-sonnet-4-5-20250929"
export const CHAT_MAX_TOKENS = 32000
export const THINKING_BUDGET = 16000
export const MAX_HISTORY_MESSAGES = 20

// ==========================================
// System Prompt Builder
// ==========================================

export function buildSystemPrompt(
    agent: ChatWithAgent["agent"],
    datasetContext?: string | null
): string {
    let systemPrompt = agent.systemPrompt || "You are a helpful AI assistant."

    // Append agent files as context
    // Append agent files as context
    if (agent.files && agent.files.length > 0) {
        let currentLength = 0
        const MAX_TOTAL_FILES_LENGTH = 150000 // ~40k tokens
        const MAX_SINGLE_FILE_LENGTH = 30000  // ~8k tokens

        const filesContext = agent.files
            .map((file) => {
                // Skip images - they consume tokens and are useless as text
                if (file.name.match(/\.(png|jpg|jpeg|gif|webp)$/i)) {
                    return ""
                }

                if (currentLength >= MAX_TOTAL_FILES_LENGTH) return ""

                let content = file.content
                if (content.length > MAX_SINGLE_FILE_LENGTH) {
                    content = content.substring(0, MAX_SINGLE_FILE_LENGTH) + "\n...[TRUNCATED due to length]..."
                }

                currentLength += content.length
                return `\n\n--- File: ${file.name} ---\n${content}`
            })
            .join("")

        // Only append if we actually added something
        if (filesContext.length > 0) {
            systemPrompt += `\n\n=== Reference Files ===${filesContext}`
            if (currentLength >= MAX_TOTAL_FILES_LENGTH) {
                systemPrompt += "\n\n[System Note: Some files were omitted or truncated to fit context limits.]"
            }
        }
    }

    // Encourage step-by-step reasoning
    systemPrompt += "\n\nTake your time to think step by step before answering."

    // Append user context if available
    const agentWithContext = agent as any
    if (agentWithContext.userContext) {
        systemPrompt += `\n\n=== USER CONTEXT (Target Audience, Style) ===\n${agentWithContext.userContext}`
    }

    // Append dataset context (RAG)
    if (datasetContext) {
        systemPrompt += datasetContext
    }

    // Add dynamic instructions for description agents
    const isDescriptionAgent = agent.name.toLowerCase().includes("описание") ||
        agent.name.toLowerCase().includes("description")

    if (isDescriptionAgent) {
        systemPrompt += buildDescriptionAgentInstructions(agent)
    }

    return systemPrompt
}

function buildDescriptionAgentInstructions(agent: any): string {
    const instructions: string[] = []

    if (agent.useEmoji) {
        instructions.push("Добавляй в текст эмодзи, где это уместно, но без фанатизма. Например вместо пунктов в тексте, можно сделать соответствующие эмодзи, но если подразумевается нумерованный список, то сделай цифры, а не эмодзи.")
    }

    const userLink = agent.subscribeLink || "@ваш_ник"

    if (agent.useSubscribe && agent.useLinkInBio) {
        instructions.push(`В конце текста должен быть призыв подписаться на мою страницу ${userLink} и в ТГ в шапке профиля. Важно, чтобы это было нативно, то есть призыв был связан с темой текста.`)
    } else if (agent.useSubscribe) {
        instructions.push(`В конце текста должен быть призыв подписаться на мою страницу ${userLink}. Важно, чтобы это было нативно, то есть призыв был связан с темой текста.`)
    } else if (agent.useLinkInBio) {
        instructions.push(`Упомяни что полезная информация есть в ТГ по ссылке в шапке профиля.`)
    }

    if (agent.codeWord) {
        instructions.push(`Добавь призыв написать кодовое слово "${agent.codeWord}" в директ/комментарии`)
    }
    if (agent.audienceQuestion) {
        instructions.push(`Задай вопрос аудитории: "${agent.audienceQuestion}"`)
    }

    let result = ""
    if (instructions.length > 0) {
        result += `\n\n=== ВАЖНЫЕ ИНСТРУКЦИИ ДЛЯ ЭТОГО ОТВЕТА ===\n${instructions.join("\n")}`
    }

    // Formatting instructions for description extraction
    result += `\n\n=== ОБЯЗАТЕЛЬНЫЙ ФОРМАТ ===
1. Максимальная длина описания: 2200 символов (строго!). Если получается больше — сокращай.
2. КАЖДОЕ описание оборачивай в маркеры:
【DESC】текст описания здесь【/DESC】

Пример правильного ответа:
**1. Заголовок**
【DESC】🎯 Полный текст первого описания со всеми эмодзи и призывами... (до 2200 символов)【/DESC】

**2. Заголовок**  
【DESC】💡 Полный текст второго описания...【/DESC】

ВАЖНО: маркеры 【DESC】 и 【/DESC】 ставь ТОЛЬКО вокруг самого описания, НЕ включай заголовки и нумерацию внутрь маркеров.`

    return result
}

// ==========================================
// Message Preparation
// ==========================================

export function prepareClaudeMessages(
    historyMessages: ChatWithAgent["messages"],
    newMessage: string | null,
    attachments: any[] | null,
    agentFiles?: { name: string; content: string }[]
): ClaudeMessage[] {
    const claudeMessages: ClaudeMessage[] = []

    // 1. Inject Agent Images as Context (User -> Assistant turn)
    if (agentFiles && agentFiles.length > 0) {
        const imageFiles = agentFiles.filter(f =>
            f.name.match(/\.(png|jpg|jpeg|gif|webp)$/i) ||
            f.content.startsWith('data:image')
        )

        if (imageFiles.length > 0) {
            const contextContent: MessageContent[] = []

            imageFiles.forEach(file => {
                // Try to extract mime and data
                let mimeType = "image/jpeg" // default
                let base64Data = file.content

                if (file.content.startsWith('data:image')) {
                    const match = file.content.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/)
                    if (match) {
                        mimeType = match[1]
                        base64Data = match[2]
                    }
                } else {
                    // Try to guess by extension if no prefix
                    const ext = file.name.split('.').pop()?.toLowerCase()
                    if (ext === 'png') mimeType = 'image/png'
                    else if (ext === 'gif') mimeType = 'image/gif'
                    else if (ext === 'webp') mimeType = 'image/webp'
                }

                contextContent.push({
                    type: "image",
                    source: {
                        type: "base64",
                        media_type: mimeType,
                        data: base64Data
                    }
                })
            })

            contextContent.push({ type: "text", text: "Reference images from agent knowledge base." })

            // Add the context turn
            claudeMessages.push({
                role: "user",
                content: contextContent
            })
            claudeMessages.push({
                role: "assistant",
                content: "I have received the reference images and will use them as context."
            })
        }
    }

    // 2. Convert history messages
    const history = historyMessages.map((msg) => {
        if (msg.attachments && msg.attachments.length > 0) {
            const content: MessageContent[] = []

            // Add images
            msg.attachments.forEach(att => {
                if (att.url.startsWith('data:image')) {
                    const match = att.url.match(/^data:(image\/[a-z]+);base64,(.+)$/)
                    if (match) {
                        content.push({
                            type: "image",
                            source: {
                                type: "base64",
                                media_type: match[1],
                                data: match[2]
                            }
                        })
                    }
                }
            })

            // Add text
            if (msg.content) {
                content.push({ type: "text", text: msg.content })
            }

            return {
                role: msg.role as "user" | "assistant",
                content: content
            }
        }

        return {
            role: msg.role as "user" | "assistant",
            content: msg.content,
        }
    })

    claudeMessages.push(...history)

    // 3. Add new user message
    const newMsgContent: MessageContent[] = []

    if (attachments && Array.isArray(attachments)) {
        attachments.forEach((att: any) => {
            if (att.url && att.url.startsWith('data:image')) {
                const match = att.url.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/)
                if (match) {
                    console.log('[ChatService] Processing image:', match[1], 'size:', match[2].length)
                    newMsgContent.push({
                        type: "image",
                        source: {
                            type: "base64",
                            media_type: match[1],
                            data: match[2]
                        }
                    })
                }
            }
        })
    }

    if (newMessage) {
        newMsgContent.push({ type: "text", text: newMessage })
    }

    claudeMessages.push({
        role: "user" as const,
        content: newMsgContent.length > 0 ? newMsgContent : (newMessage || ""),
    })

    return claudeMessages
}

// ==========================================
// Database Operations
// ==========================================

export async function saveUserMessage(
    chatId: string,
    content: string,
    attachments: any[] | null
): Promise<Message> {
    const savedMessage = await prisma.message.create({
        data: {
            chatId,
            role: "user",
            content: content || "",
        },
    })

    // Save attachments
    if (attachments && Array.isArray(attachments)) {
        await Promise.all(attachments.map(async (att: any) => {
            await prisma.attachment.create({
                data: {
                    messageId: savedMessage.id,
                    url: att.url,
                    name: att.name,
                    type: att.contentType
                }
            })
        }))
    }

    return savedMessage
}

export async function saveAssistantMessage(
    chatId: string,
    content: string,
    usage: { input_tokens: number; output_tokens: number }
): Promise<void> {
    try {
        await prisma.message.create({
            data: {
                chatId,
                role: "assistant",
                content,
                promptTokens: usage.input_tokens,
                completionTokens: usage.output_tokens,
            },
        })

        // Update chat timestamp
        await prisma.chat.update({
            where: { id: chatId },
            data: { updatedAt: new Date() }
        })

        console.log(`[ChatService] Saved assistant message to chat ${chatId} (${content.length} chars)`)
    } catch (error) {
        console.error("[ChatService] Failed to save message:", error)
    }
}

export async function generateAndSaveChatTitle(
    chatId: string,
    firstMessage: string
): Promise<void> {
    try {
        const title = await generateChatTitle(firstMessage)
        await prisma.chat.update({
            where: { id: chatId },
            data: { title }
        })
    } catch (error) {
        console.error("[ChatService] Failed to generate chat title:", error)
    }
}

// ==========================================
// Chat Fetching
// ==========================================

export async function getChatWithContext(chatId: string): Promise<ChatWithAgent | null> {
    return prisma.chat.findUnique({
        where: { id: chatId },
        include: {
            agent: {
                include: {
                    files: true,
                },
            },
            messages: {
                orderBy: { createdAt: "asc" },
                take: MAX_HISTORY_MESSAGES,
                include: {
                    attachments: true
                }
            },
        },
    }) as Promise<ChatWithAgent | null>
}
