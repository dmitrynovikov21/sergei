const { ApifyClient } = require('apify-client');

/**
 * Instagram Scraper with SEPARATE Reels/Posts Parsing
 * 
 * NEW LOGIC:
 * - If user wants BOTH Reels AND Carousels → TWO separate API calls
 * - Request 1: instagram-reel-scraper for Reels
 * - Request 2: instagram-scraper for Carousels/Images
 * - Results are merged before returning
 * 
 * @param {string} urlOrUsername - Full URL or username
 * @param {number} _limit - Requested limit (ignored)
 * @param {number} daysLimit - Days to look back for date filtering
 * @param {object} credentials - Optional login credentials
 * @param {string} contentTypes - Comma-separated types: "Video", "Sidecar", "Image"
 */
async function scrapeInstagram(urlOrUsername, _limit, daysLimit = 30, credentials = {}, contentTypes = null) {
    const APIFY_TOKEN = process.env.APIFY_TOKEN;
    if (!APIFY_TOKEN) throw new Error("APIFY_TOKEN is missing");

    const client = new ApifyClient({ token: APIFY_TOKEN });

    // 1. Parse URL to extract username - handle various input formats
    let cleanInput = urlOrUsername.trim();

    // Remove common typos and normalize
    cleanInput = cleanInput.replace(/^httos:/i, 'https:');
    cleanInput = cleanInput.replace(/^htto:/i, 'http:');

    // Extract username from URL or use as-is
    let username;
    let directUrl;

    if (cleanInput.includes('instagram.com')) {
        // It's a URL - extract username
        const usernameMatch = cleanInput.match(/instagram\.com\/([a-zA-Z0-9._]+)/);
        username = usernameMatch ? usernameMatch[1] : null;
        if (!username) throw new Error(`Could not extract username from URL: ${cleanInput}`);
        directUrl = `https://www.instagram.com/${username}/`;
    } else {
        // It's just a username (possibly with @)
        username = cleanInput.replace(/^@/, '');
        directUrl = `https://www.instagram.com/${username}/`;
    }

    // 2. Parse contentTypes
    const requestedTypes = contentTypes ? contentTypes.split(",").map(t => t.trim()) : ["Video", "Sidecar", "Image"];
    const wantsReels = requestedTypes.includes("Video");
    const wantsCarousels = requestedTypes.includes("Sidecar") || requestedTypes.includes("Image");

    console.log(`[Apify] Target: ${username}`);
    console.log(`[Apify] URL: ${directUrl}`);
    console.log(`[Apify] Requested Types: ${requestedTypes.join(", ")}`);
    console.log(`[Apify] Days Limit: ${daysLimit}`);
    console.log(`[Apify] Wants Reels: ${wantsReels}, Wants Carousels: ${wantsCarousels}`);

    let allPosts = [];

    // === SEPARATE PARSING ===

    // 3a. Fetch REELS using dedicated scraper
    if (wantsReels) {
        console.log(`\n[Apify] === FETCHING REELS ===`);
        const reels = await scrapeWithActor(client, "apify/instagram-reel-scraper", {
            "username": [username],
            "resultsLimit": 500
        }, credentials, daysLimit, ["Video"]);
        console.log(`[Apify] Reels fetched: ${reels.length}`);
        allPosts.push(...reels);
    }

    // 3b. Fetch CAROUSELS/IMAGES using general scraper
    if (wantsCarousels) {
        console.log(`\n[Apify] === FETCHING CAROUSELS/IMAGES ===`);
        const nonReelTypes = requestedTypes.filter(t => t !== "Video");
        const posts = await scrapeWithActor(client, "apify/instagram-scraper", {
            "directUrls": [directUrl],
            "resultsType": "posts",
            "resultsLimit": 2000,
            "searchType": "user",
            "onlyPostsNewerThan": `${daysLimit} days`,
            "proxy": {
                "useApifyProxy": true,
                "apifyProxyGroups": ["RESIDENTIAL"]
            }
        }, credentials, daysLimit, nonReelTypes);
        console.log(`[Apify] Carousels/Images fetched: ${posts.length}`);
        allPosts.push(...posts);
    }

    console.log(`\n[Apify] === TOTAL MERGED: ${allPosts.length} posts ===`);
    return allPosts;
}

/**
 * Execute a single Apify actor and process results
 */
async function scrapeWithActor(client, actorId, runInput, credentials, daysLimit, allowedTypes) {
    // Add credentials if available
    if (credentials.igUsername || process.env.IG_USERNAME) {
        runInput["loginUsername"] = credentials.igUsername || process.env.IG_USERNAME;
        runInput["loginPassword"] = credentials.igPassword || process.env.IG_PASSWORD;
    }

    console.log(`[Apify] Actor: ${actorId}`);
    console.log(`[Apify] Input:`, JSON.stringify(runInput, null, 2));

    try {
        const run = await client.actor(actorId).call(runInput, {
            waitSecs: 600
        });

        console.log(`[Apify] Run Finished. Status: ${run.status}`);

        // Check for errors in logs
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

        // Fetch Results
        const { items } = await client.dataset(run.defaultDatasetId).listItems();
        console.log(`[Apify] Fetched ${items.length} items.`);

        if (items.length === 0 && runError) {
            throw new Error(`Apify returned 0 items. Reason: ${runError}`);
        }

        // Filter out error items
        const validItems = items.filter(i => !i.error);
        console.log(`[Apify] Valid items (no errors): ${validItems.length}`);

        // Normalize types
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

        // Apply date filter
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysLimit);

        const dateFiltered = normalized.filter(item => {
            if (!item.timestamp) return true;
            const itemDate = new Date(item.timestamp);
            return itemDate >= cutoffDate;
        });

        console.log(`[Apify] Date filtered: ${normalized.length} -> ${dateFiltered.length} items (last ${daysLimit} days)`);

        // Apply type filter
        let finalResult = dateFiltered;
        if (allowedTypes && allowedTypes.length > 0) {
            finalResult = dateFiltered.filter(item => allowedTypes.includes(item.type));
            console.log(`[Apify] Type filtered: ${dateFiltered.length} -> ${finalResult.length} items (types: ${allowedTypes.join(", ")})`);
        }

        return finalResult;

    } catch (e) {
        console.error(`[Apify] CRITICAL ERROR in ${actorId}:`, e.message);
        // Return empty array on error (don't break entire flow)
        return [];
    }
}

module.exports = { scrapeInstagram };
