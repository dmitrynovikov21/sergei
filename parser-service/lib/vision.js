const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
});

/**
 * Extract headline text from Instagram cover image using Claude 3 Haiku (cheapest vision model)
 * Process type: TECHNICAL (for cost tracking)
 * 
 * Haiku cost: $0.25 / 1M input tokens, $1.25 / 1M output tokens
 * ~10x cheaper than Sonnet
 */
async function extractHeadlineFromCover(imageUrl) {
    try {
        console.log('[OCR] Using Claude Haiku for headline extraction...');

        // Fetch image with browser headers (Instagram CDN blocks bare requests)
        const imageResponse = await fetch(imageUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': 'https://www.instagram.com/',
            }
        });

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

        // Use Claude 3 Haiku - cheapest model with vision capability
        const response = await anthropic.messages.create({
            model: "claude-3-haiku-20240307",  // CHEAPEST model
            max_tokens: 256,  // Headlines are short, save tokens
            metadata: {
                user_id: "system_technical"  // Mark as technical process for tracking
            },
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
                            text: `Извлеки ТОЧНЫЙ текст заголовка с изображения. Только текст, без комментариев.`
                        }
                    ]
                }
            ]
        });

        // Extract text from response
        const textContent = response.content.find(c => c.type === "text");
        const headline = textContent ? textContent.text.trim() : "";

        console.log(`[OCR] Headline: "${headline.substring(0, 50)}${headline.length > 50 ? '...' : ''}"`);

        // Log usage for cost tracking
        console.log(`[OCR] Tokens: input=${response.usage.input_tokens}, output=${response.usage.output_tokens} [TECHNICAL]`);

        return headline;

    } catch (error) {
        console.error("[OCR] Error:", error.message);
        throw error;
    }
}

module.exports = { extractHeadlineFromCover };
