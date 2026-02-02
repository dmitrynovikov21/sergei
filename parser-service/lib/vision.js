const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
});

/**
 * Extract headline text from Instagram cover image using Claude Vision
 */
async function extractHeadlineFromCover(imageUrl) {
    try {
        // Fetch image and convert to base64
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
            throw new Error(`Failed to fetch image: ${imageResponse.status}`);
        }

        const imageBuffer = await imageResponse.arrayBuffer();
        const base64Image = Buffer.from(imageBuffer).toString("base64");

        // Determine media type
        const contentType = imageResponse.headers.get("content-type") || "image/jpeg";
        const mediaType = contentType.includes("png") ? "image/png" :
            contentType.includes("gif") ? "image/gif" :
                contentType.includes("webp") ? "image/webp" : "image/jpeg";

        const response = await anthropic.messages.create({
            model: "claude-sonnet-4-5-20250929",
            max_tokens: 8192,
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "image",
                            source: {
                                type: "base64",
                                media_type: mediaType,
                                data: base64Image
                            }
                        },
                        {
                            type: "text",
                            text: `Проанализируй это изображение (обложку Instagram рилс/поста). 
                            
Извлеки ТОЧНЫЙ текст заголовка, который отображается на изображении.

Правила:
- Верни ТОЛЬКО текст заголовка, без описаний или комментариев
- Если текста несколько строк, объедини их в одну строку
- Если на изображении нет текста, верни пустую строку
- Не добавляй кавычки или форматирование

Ответ (только текст заголовка):`
                        }
                    ]
                }
            ]
        });

        // Extract text from response
        const textContent = response.content.find(c => c.type === "text");
        return textContent ? textContent.text.trim() : "";

    } catch (error) {
        console.error("Claude vision error:", error);
        throw error;
    }
}

module.exports = { extractHeadlineFromCover };
