/**
 * Apify Service - Integration with Apify for Instagram scraping
 * 
 * Uses apify/instagram-scraper actor to fetch posts from profiles
 */

import Anthropic from "@anthropic-ai/sdk"

// ==========================================
// Types
// ==========================================

export interface ApifyInstagramPost {
    id: string
    shortCode: string
    url: string
    type: "Image" | "Video" | "Sidecar"
    caption?: string
    displayUrl: string        // Cover image URL
    videoUrl?: string         // Video URL (for reels/videos)
    likesCount: number
    commentsCount: number
    videoViewCount?: number   // Views (for videos) - may be 0
    playCount?: number        // Alternative views field
    viewCount?: number        // Another alternative
    videoPlayCount?: number   // Yet another alternative
    timestamp: string         // ISO date string
    ownerUsername: string
}

interface ApifyRunResult {
    items: ApifyInstagramPost[]
}

// ==========================================
// Configuration
// ==========================================

const APIFY_TOKEN = process.env.APIFY_TOKEN
const APIFY_ACTOR = "apify/instagram-scraper"

// ==========================================
// Apify API Functions
// ==========================================

/**
 * Scrape Instagram profile posts using Apify
 */
export async function scrapeInstagram(
    username: string,
    limit: number = 20,
    daysLimit: number = 30
): Promise<ApifyInstagramPost[]> {
    if (!APIFY_TOKEN) {
        throw new Error("APIFY_TOKEN not configured")
    }

    // Calculate the cutoff date for filtering posts
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysLimit)
    const onlyPostsNewerThan = cutoffDate.toISOString()

    console.log(`[Apify] Scraping @${username}, limit: ${limit}, only posts newer than: ${onlyPostsNewerThan}`)

    // Apify API uses username~actorname format in URLs
    const actorId = APIFY_ACTOR.replace("/", "~")
    const url = `https://api.apify.com/v2/acts/${actorId}/runs?token=${APIFY_TOKEN}`

    const input = {
        directUrls: [`https://www.instagram.com/${username}/`],
        resultsType: "posts",
        resultsLimit: limit,
        addParentData: false,
        onlyPostsNewerThan, // Filter posts by date on Apify side
        // Use Apify proxy to avoid IP bans
        proxy: {
            useApifyProxy: true,
            apifyProxyGroups: ["RESIDENTIAL"]
        }
    }

    try {
        // Start the actor run
        const startResponse = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(input)
        })

        if (!startResponse.ok) {
            throw new Error(`Apify start failed: ${await startResponse.text()}`)
        }

        const runData = await startResponse.json()
        const runId = runData.data.id

        // Wait for completion (poll every 5 seconds, max 5 minutes)
        let attempts = 0
        const maxAttempts = 60

        while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 5000))
            console.log(`[Apify] Polling run ${runId} (Attempt ${attempts + 1}/${maxAttempts})...`)

            const statusResponse = await fetch(
                `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`,
                { cache: "no-store" } // Disable Next.js caching
            )
            const statusData = await statusResponse.json()

            if (statusData.data.status === "SUCCEEDED") {
                // Fetch results
                const resultsResponse = await fetch(
                    `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${APIFY_TOKEN}`,
                    { cache: "no-store" }
                )
                const results: ApifyInstagramPost[] = await resultsResponse.json()
                return results
            }

            if (statusData.data.status === "FAILED" || statusData.data.status === "ABORTED") {
                throw new Error(`Apify run failed with status: ${statusData.data.status}`)
            }

            attempts++
        }

        throw new Error("Apify run timed out")

    } catch (error) {
        console.error("Apify scrape error:", error)
        throw error
    }
}

// ==========================================
// Claude Vision - Extract Headline from Cover
// ==========================================

const anthropic = new Anthropic()

/**
 * Extract headline text from Instagram cover image using Claude Vision
 */
export async function extractHeadlineFromCover(imageUrl: string): Promise<string> {
    try {
        // Fetch image and convert to base64
        const imageResponse = await fetch(imageUrl)
        if (!imageResponse.ok) {
            throw new Error(`Failed to fetch image: ${imageResponse.status}`)
        }

        const imageBuffer = await imageResponse.arrayBuffer()
        const base64Image = Buffer.from(imageBuffer).toString("base64")

        // Determine media type
        const contentType = imageResponse.headers.get("content-type") || "image/jpeg"
        const mediaType = contentType.includes("png") ? "image/png" :
            contentType.includes("gif") ? "image/gif" :
                contentType.includes("webp") ? "image/webp" : "image/jpeg"

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
                                media_type: mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
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
        })

        // Extract text from response
        const textContent = response.content.find(c => c.type === "text")
        return textContent ? textContent.text.trim() : ""

    } catch (error) {
        console.error("Claude vision error:", error)
        throw error
    }
}

// ==========================================
// Utility Functions
// ==========================================

/**
 * Extract username from Instagram URL
 */
export function extractUsername(url: string): string | null {
    const match = url.match(/instagram\.com\/([^/?]+)/)
    return match ? match[1] : null
}
