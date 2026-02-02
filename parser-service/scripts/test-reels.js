
const { ApifyClient } = require('apify-client');
require('dotenv').config({ path: '../.env' });

async function main() {
    const APIFY_TOKEN = process.env.APIFY_TOKEN;
    const client = new ApifyClient({ token: APIFY_TOKEN });
    const directUrl = "https://www.instagram.com/zahar__bz/reels/";

    console.log(`Testing Reels Scrape for: ${directUrl}`);

    const runInput = {
        "directUrls": [directUrl],
        "resultsType": "posts",
        "resultsLimit": 100, // Small test limit
        "searchType": "user", // "user" mode should handle profile URLs including /reels/
        "proxy": {
            "useApifyProxy": true,
            "apifyProxyGroups": ["RESIDENTIAL"]
        }
    };

    console.log("Starting run...");
    const run = await client.actor("apify/instagram-scraper").call(runInput);
    console.log("Run finished:", run.status);

    const dataset = await client.dataset(run.defaultDatasetId).listItems();
    console.log(`Fetched ${dataset.items.length} items from /reels/.`);

    // Check types
    if (dataset.items.length > 0) {
        const types = {};
        dataset.items.forEach(i => {
            const t = i.type || (i.isVideo ? 'Video' : 'Image');
            types[t] = (types[t] || 0) + 1;
        });
        console.log("Types:", types);
        // Date range
        const dates = dataset.items.map(i => new Date(i.timestamp)).sort((a, b) => a - b);
        console.log("Range:", dates[0].toISOString(), " - ", dates[dates.length - 1].toISOString());
    }
}

main().catch(console.error);
