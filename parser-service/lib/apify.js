const { ApifyClient } = require('apify-client');

/**
 * Instagram Scraper with Reels Support
 * 
 * Uses different actors based on contentType:
 * - contentTypes = "Video" only → apify/instagram-reel-scraper (dedicated Reels scraper)
 * - Other cases → apify/instagram-scraper (general scraper)
 * 
 * @param {string} urlOrUsername - Full URL (e.g. .../reels/) or username
 * @param {number} _limit - Requested limit (ignored)
 * @param {number} daysLimit - Days to look back for date filtering
 * @param {object} credentials - Optional login credentials
 * @param {string} contentTypes - Comma-separated types: "Video", "Sidecar", "Image"
 */
async function scrapeInstagram(urlOrUsername, _limit, daysLimit = 30, credentials = {}, contentTypes = null) {
    const APIFY_TOKEN = process.env.APIFY_TOKEN;
    if (!APIFY_TOKEN) throw new Error("APIFY_TOKEN is missing");

    const client = new ApifyClient({ token: APIFY_TOKEN });

    // 1. Parse URL to extract username
    let directUrl = urlOrUsername;
    if (!urlOrUsername.startsWith('http')) {
        directUrl = `https://www.instagram.com/${urlOrUsername}/`;
    }

    // Extract username from URL
    const usernameMatch = directUrl.match(/instagram\.com\/([^\/\?]+)/);
    const username = usernameMatch ? usernameMatch[1] : urlOrUsername;

    // 2. Parse contentTypes
    const requestedTypes = contentTypes ? contentTypes.split(",").map(t => t.trim()) : [];
    const onlyReels = requestedTypes.length === 1 && requestedTypes[0] === "Video";

    console.log(`[Apify] Target: ${username}`);
    console.log(`[Apify] URL: ${directUrl}`);
    console.log(`[Apify] Requested Content Types: ${requestedTypes.join(", ") || "All"}`);
    console.log(`[Apify] Days Limit: ${daysLimit}`);

    // 3. Choose Actor & Build Input
    let actorId;
    let runInput;

    if (onlyReels) {
        // Use dedicated Instagram Reel Scraper for Reels-only requests
        actorId = "apify/instagram-reel-scraper";

        console.log(`[Apify] Using DEDICATED Reels Scraper (apify/instagram-reel-scraper)`);

        runInput = {
            "username": [username],
            "resultsLimit": 500  // Reasonable limit for one profile
        };
    } else {
        // Use general Instagram Scraper for mixed content
        actorId = "apify/instagram-scraper";

        console.log(`[Apify] Using General Instagram Scraper (apify/instagram-scraper)`);

        const dateLimitStr = `${daysLimit} days`;

        runInput = {
            "directUrls": [directUrl],
            "resultsType": "posts",
            "resultsLimit": 2000,
            "searchType": "user",
            "onlyPostsNewerThan": dateLimitStr,
            "proxy": {
                "useApifyProxy": true,
                "apifyProxyGroups": ["RESIDENTIAL"]
            }
        };
    }

    // Add credentials if available
    if (credentials.igUsername || process.env.IG_USERNAME) {
        runInput["loginUsername"] = credentials.igUsername || process.env.IG_USERNAME;
        runInput["loginPassword"] = credentials.igPassword || process.env.IG_PASSWORD;
    }

    console.log('[Apify] Actor:', actorId);
    console.log('[Apify] Input:', JSON.stringify(runInput, null, 2));

    // 4. Run Actor
    try {
        const run = await client.actor(actorId).call(runInput, {
            waitSecs: 600
        });

        console.log(`[Apify] Run Finished. Status: ${run.status}`);

        // 5. Check for errors in logs
        const log = await client.log(run.id).get();
        const cleanLog = log ? log.toLowerCase() : "";

        let runError = null;
        if (cleanLog.includes("login required")) runError = "Login Required";
        else if (cleanLog.includes("checkpoint_required")) runError = "Checkpoint Required";
        else if (cleanLog.includes("rate limit") || cleanLog.includes("429")) runError = "Rate Limit (429)";
        else if (cleanLog.includes("upstream503")) runError = "Proxy Error (503)";
        else if (run.status === 'FAILED') runError = "Apify Run Failed";

        if (runError) {
            console.error(`[Apify] Detected Error: ${runError}`);
            if (run.status !== 'SUCCEEDED') throw new Error(runError);
        }

        // 6. Fetch Results
        const { items } = await client.dataset(run.defaultDatasetId).listItems();
        console.log(`[Apify] Fetched ${items.length} items.`);

        if (items.length === 0 && runError) {
            throw new Error(`Apify returned 0 items. Reason: ${runError}`);
        }

        // 7. Filter out error items
        const validItems = items.filter(i => !i.error);
        console.log(`[Apify] Valid items (no errors): ${validItems.length}`);

        if (validItems.length > 0) {
            console.log("[Apify] Sample Item Keys:", Object.keys(validItems[0]).slice(0, 15));
            console.log("[Apify] Sample Item:", {
                type: validItems[0].type,
                productType: validItems[0].productType,
                videoPlayCount: validItems[0].videoPlayCount,
                likesCount: validItems[0].likesCount,
                timestamp: validItems[0].timestamp,
                caption: validItems[0].caption ? validItems[0].caption.substring(0, 50) : "N/A"
            });
        }

        // 8. Normalize types
        const normalized = validItems.map(item => {
            let type = item.type;
            if (!type) {
                // Fallback detection
                if (item.isVideo || item.productType === 'clips' || item.videoUrl) {
                    type = 'Video';
                } else if (item.childPosts && item.childPosts.length > 0) {
                    type = 'Sidecar';
                } else {
                    type = 'Image';
                }
            }
            // Capitalize first letter
            if (typeof type === 'string') {
                type = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
            }
            item.type = type;
            return item;
        });

        // 9. Apply date filter (required for instagram-reel-scraper which doesn't support onlyPostsNewerThan)
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysLimit);

        const dateFiltered = normalized.filter(item => {
            if (!item.timestamp) return true; // Keep items without timestamp
            const itemDate = new Date(item.timestamp);
            return itemDate >= cutoffDate;
        });

        console.log(`[Apify] Date filtered: ${normalized.length} -> ${dateFiltered.length} items (last ${daysLimit} days)`);

        // 10. Apply contentTypes filter
        let finalResult = dateFiltered;
        if (requestedTypes.length > 0) {
            finalResult = dateFiltered.filter(item => requestedTypes.includes(item.type));
            console.log(`[Apify] Type filtered: ${dateFiltered.length} -> ${finalResult.length} items (types: ${requestedTypes.join(", ")})`);
        }

        console.log(`[Apify] Final result: ${finalResult.length} items`);

        return finalResult;

    } catch (e) {
        console.error("[Apify] CRITICAL ERROR:", e.message);
        throw e;
    }
}

module.exports = { scrapeInstagram };
