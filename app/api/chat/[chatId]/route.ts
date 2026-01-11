import { NextRequest } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { anthropic, DEFAULT_MODEL, CLAUDE_MODELS } from "@/lib/anthropic"
import { getDatasetContext } from "@/actions/datasets"
import { generateChatTitle } from "@/lib/chat-titles"

export const runtime = "nodejs"
export const maxDuration = 60 // Allow up to 60 seconds for streaming

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
        const chat = await prisma.chat.findUnique({
            where: { id: params.chatId },
            include: {
                agent: {
                    include: {
                        files: true, // Include agent files for context
                    },
                },
                messages: {
                    orderBy: { createdAt: "asc" },
                    // Reduced from 50 to 20 to prevent 200k token overflow (216k > 200k witnessed)
                    take: 20,
                    include: {
                        attachments: true
                    }
                },
            },
        })

        if (!chat || chat.userId !== session.user.id) {
            return new Response("Chat not found", { status: 404 })
        }

        // 4. Build system prompt with agent files
        let systemPrompt = chat.agent.systemPrompt || "You are a helpful AI assistant."

        // Append file contents to system prompt
        if (chat.agent.files && chat.agent.files.length > 0) {
            const filesContext = chat.agent.files
                .map((file) => `\n\n--- File: ${file.name} ---\n${file.content}`)
                .join("")
            systemPrompt += `\n\n=== Reference Files ===${filesContext}`
        }

        // Encourage reasoning
        systemPrompt += "\n\nTake your time to think step by step before answering."

        // 4.1 Append User Context (Target Audience, etc.)
        const agentWithContext = chat.agent as any
        if (agentWithContext.userContext) {
            systemPrompt += `\n\n=== USER CONTEXT (Target Audience, Style) ===\n${agentWithContext.userContext}`
        }

        // 5. RAG: Inject context from SELECTED dataset
        if (chat.datasetId) {
            const datasetContext = await getDatasetContext(chat.datasetId)
            if (datasetContext) {
                systemPrompt += datasetContext
            }
        }

        // 6. Add dynamic instructions for "Описание Reels" agent based on settings
        const isDescriptionAgent = chat.agent.name.toLowerCase().includes("описание") ||
            chat.agent.name.toLowerCase().includes("description")

        if (isDescriptionAgent) {
            const agent = chat.agent as any // Type assertion for custom fields
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

            if (instructions.length > 0) {
                systemPrompt += `\n\n=== ВАЖНЫЕ ИНСТРУКЦИИ ДЛЯ ЭТОГО ОТВЕТА ===\n${instructions.join("\n")}`
            }

            // Always add formatting instruction for description agent
            systemPrompt += `\n\n=== ОБЯЗАТЕЛЬНЫЙ ФОРМАТ ===
КАЖДОЕ описание оборачивай в маркеры:
【DESC】текст описания здесь【/DESC】

Пример правильного ответа:
**1. Заголовок**
【DESC】🎯 Полный текст первого описания со всеми эмодзи и призывами...【/DESC】

**2. Заголовок**  
【DESC】💡 Полный текст второго описания...【/DESC】

ВАЖНО: маркеры 【DESC】 и 【/DESC】 ставь ТОЛЬКО вокруг самого описания, НЕ включай заголовки и нумерацию внутрь маркеров.`
        }

        // 5. Build messages array for Claude
        const claudeMessages: any[] = chat.messages.map((msg) => {
            if (msg.attachments && msg.attachments.length > 0) {
                const content: any[] = []

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

        // Add the new user message
        const newMsgContent: any[] = []

        if (attachments && Array.isArray(attachments)) {
            attachments.forEach((att: any) => {
                // Support all image formats: jpeg, jpg, png, gif, webp, svg+xml, etc.
                if (att.url && att.url.startsWith('data:image')) {
                    // More flexible regex to match image/jpeg, image/png, image/webp, image/gif, image/svg+xml, etc.
                    const match = att.url.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/)
                    if (match) {
                        console.log('[Chat API] Processing image:', match[1], 'size:', match[2].length)
                        newMsgContent.push({
                            type: "image",
                            source: {
                                type: "base64",
                                media_type: match[1],
                                data: match[2]
                            }
                        })
                    } else {
                        console.log('[Chat API] Failed to parse image URL:', att.url.substring(0, 50))
                    }
                }
            })
        }

        console.log('[Chat API] newMsgContent items:', newMsgContent.length)

        if (message) {
            newMsgContent.push({ type: "text", text: message })
        }

        claudeMessages.push({
            role: "user" as const,
            content: newMsgContent.length > 0 ? newMsgContent : message,
        })

        // 6. Save user message to DB
        const savedMessage = await prisma.message.create({
            data: {
                chatId: params.chatId,
                role: "user",
                content: message || "",
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

        // Generate AI title for first message in chat
        // We use chat.messages.length which is from the initial fetch (before current message)
        if (chat.messages.length === 0) {
            try {
                // If message is empty (e.g. only attachment), use a fallback prompt
                const titlePrompt = message || (attachments && attachments.length > 0 ? "Analyzed file" : "New Chat")
                const title = await generateChatTitle(titlePrompt)

                await prisma.chat.update({
                    where: { id: params.chatId },
                    data: { title }
                })
            } catch (error) {
                console.error("Failed to generate chat title:", error)
            }
        }

        // 7. Get model from agent or use default
        const modelKey = chat.agent.model as keyof typeof CLAUDE_MODELS
        const model = CLAUDE_MODELS[modelKey] || DEFAULT_MODEL

        // 8. Create streaming response
        console.log("-----------------------------------------")
        console.log("DEBUG: Using Model:", model)
        console.log("DEBUG: System Prompt Length:", systemPrompt?.length)
        console.log("-----------------------------------------")

        // Enable Thinking for supported models (3.7 Sonnet, 4.5 Sonnet)
        const isThinkingModel = model.includes("sonnet-4-5") || model.includes("sonnet-3-7")

        const messagingOptions: any = {
            model,
            max_tokens: isThinkingModel ? 32000 : 8192, // Increased to accommodate 16k thinking + output
            system: systemPrompt,
            messages: claudeMessages,
            metadata: { user_id: session.user.id },
        }

        if (isThinkingModel) {
            messagingOptions.thinking = {
                type: "enabled",
                budget_tokens: 16000 // Maximum effective budget for deep reasoning
            }
        }

        const stream = await anthropic.messages.stream(messagingOptions)

        // 9. Create a TransformStream to process the response
        const encoder = new TextEncoder()
        let fullResponse = ""
        const chatId = params.chatId

        // Track if message was saved
        let messageSaved = false

        // Background save function - runs independently of stream
        const saveAssistantMessage = async (response: string, usage: { input_tokens: number; output_tokens: number }) => {
            if (messageSaved) return // Already saved
            messageSaved = true

            try {
                await prisma.message.create({
                    data: {
                        chatId,
                        role: "assistant",
                        content: response,
                        promptTokens: usage.input_tokens,
                        completionTokens: usage.output_tokens,
                    },
                })

                // Update chat timestamp
                await prisma.chat.update({
                    where: { id: chatId },
                    data: { updatedAt: new Date() },
                })

                console.log(`[Chat] Saved assistant message to chat ${chatId} (${response.length} chars)`)
            } catch (error) {
                console.error("[Chat] Failed to save message:", error)
            }
        }

        const readable = new ReadableStream({
            async start(controller) {
                try {
                    for await (const event of stream) {
                        // Only stream the actual text response, not thinking blocks
                        if (event.type === "content_block_delta") {
                            const delta = event.delta as any
                            if (delta.type === "text_delta" && delta.text) {
                                fullResponse += delta.text
                                controller.enqueue(encoder.encode(delta.text))
                            }
                            // Thinking is processed internally but NOT shown to user
                        }
                    }

                    // After streaming completes, save assistant message
                    const finalMessage = await stream.finalMessage()
                    await saveAssistantMessage(fullResponse, finalMessage.usage)

                    controller.close()
                } catch (error) {
                    console.error("Stream error:", error)

                    // Even on error, try to save partial response if we have any
                    if (fullResponse.length > 0 && !messageSaved) {
                        console.log(`[Chat] Stream interrupted, saving partial response (${fullResponse.length} chars)`)
                        await saveAssistantMessage(fullResponse, { input_tokens: 0, output_tokens: 0 })
                    }

                    controller.error(error)
                }
            },

            // This is called when the client disconnects
            cancel: async () => {
                console.log(`[Chat] Client disconnected from chat ${chatId}`)

                // Save whatever we have so far
                if (fullResponse.length > 0 && !messageSaved) {
                    console.log(`[Chat] Saving response on disconnect (${fullResponse.length} chars)`)
                    await saveAssistantMessage(fullResponse, { input_tokens: 0, output_tokens: 0 })
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
    } catch (error) {
        console.error("Chat API error:", error)
        return new Response(
            error instanceof Error ? error.message : "Internal server error",
            { status: 500 }
        )
    }
}
