/**
 * Parser Service HTTP Client
 * 
 * Communicates with standalone parser microservice for Instagram scraping
 */

const PARSER_SERVICE_URL = process.env.PARSER_SERVICE_URL || 'http://localhost:3001';

export interface ApifyInstagramPost {
    id: string
    shortCode: string
    url: string
    type: "Image" | "Video" | "Sidecar"
    caption?: string
    displayUrl: string
    videoUrl?: string
    likesCount: number
    commentsCount: number
    videoViewCount?: number
    playCount?: number
    viewCount?: number
    videoPlayCount?: number
    timestamp: string
    ownerUsername: string
}

/**
 * Scrape Instagram profile via parser service
 * Uses 10-minute timeout for long-running Apify jobs
 */
export async function scrapeInstagram(
    username: string,
    limit: number = 20,
    daysLimit: number = 30,
    contentTypes?: string  // "Video", "Sidecar", "Image" or comma-separated
): Promise<ApifyInstagramPost[]> {
    const credentials: any = {};

    if (process.env.IG_USERNAME && process.env.IG_PASSWORD) {
        credentials.igUsername = process.env.IG_USERNAME;
        credentials.igPassword = process.env.IG_PASSWORD;
    }

    console.log(`[ParserClient] Requesting: ${PARSER_SERVICE_URL}/api/scrape`);
    console.log(`[ParserClient] ContentTypes: ${contentTypes || 'All'}`);

    // Create abort controller with 15-minute timeout for long-running Apify jobs
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15 * 60 * 1000); // 15 minutes

    try {
        // Use fetch with extended timeout - Apify jobs can take 6-10 minutes
        const response = await fetch(`${PARSER_SERVICE_URL}/api/scrape`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Connection': 'keep-alive',
            },
            body: JSON.stringify({
                username,
                limit,
                daysLimit,
                contentTypes,
                ...credentials
            }),
            signal: controller.signal,
            // @ts-ignore - Node.js fetch supports these undici options
            keepalive: true,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[ParserClient] Service error ${response.status}: ${errorText}`);
            try {
                const error = JSON.parse(errorText);
                throw new Error(error.error || `Parser service error: ${response.status}`);
            } catch {
                throw new Error(`Parser service error: ${response.status} - ${errorText}`);
            }
        }

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Unknown parser service error');
        }

        return data.posts;
    } catch (error) {
        clearTimeout(timeoutId);
        console.error(`[ParserClient] Fetch failed:`, error);
        if (error instanceof Error && error.message.includes('fetch')) {
            throw new Error(`Parser service is unavailable at ${PARSER_SERVICE_URL}. Cause: ${error.message}`);
        }
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error(`Parser service request timed out after 10 minutes`);
        }
        throw error;
    }
}

/**
 * Extract headline from cover image via parser service
 */
export async function extractHeadlineFromCover(imageUrl: string): Promise<string> {
    try {
        const response = await fetch(`${PARSER_SERVICE_URL}/api/extract-headline`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ imageUrl }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || `Parser service error: ${response.status}`);
        }

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Unknown parser service error');
        }

        return data.headline;
    } catch (error) {
        if (error instanceof Error && error.message.includes('fetch')) {
            throw new Error('Parser service is unavailable. Please ensure it is running on port 3001.');
        }
        throw error;
    }
}

/**
 * Extract username from Instagram URL
 */
export function extractUsername(url: string): string | null {
    const match = url.match(/instagram\.com\/([^/?]+)/);
    return match ? match[1] : null;
}
