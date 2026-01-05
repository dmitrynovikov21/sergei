import { NextRequest } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { anthropic, DEFAULT_MODEL, CLAUDE_MODELS } from "@/lib/anthropic"
import { getDatasetContext } from "@/actions/datasets"

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
                    take: 50, // Limit context window
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
                instructions.push("Используй эмодзи в тексте")
            }
            if (agent.useSubscribe) {
                instructions.push("Добавь призыв подписаться в конце")
            }
            if (agent.useLinkInBio) {
                instructions.push("Упомяни ссылку в шапке профиля")
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
                if (att.url.startsWith('data:image')) {
                    const match = att.url.match(/^data:(image\/[a-z]+);base64,(.+)$/)
                    if (match) {
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

        // 7. Get model from agent or use default
        const modelKey = chat.agent.model as keyof typeof CLAUDE_MODELS
        const model = CLAUDE_MODELS[modelKey] || DEFAULT_MODEL

        // 8. Create streaming response
        const stream = await anthropic.messages.stream({
            model,
            max_tokens: 4096,
            system: systemPrompt,
            messages: claudeMessages,
        })

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
                        if (event.type === "content_block_delta") {
                            const delta = event.delta
                            if ("text" in delta) {
                                fullResponse += delta.text
                                controller.enqueue(encoder.encode(delta.text))
                            }
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
                "Content-Type": "text/plain; charset=utf-8",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
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
