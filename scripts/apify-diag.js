require('dotenv').config();
const { ApifyClient } = require('apify-client');

async function testApify() {
    console.log("=== STARTING APIFY DIAGNOSTIC TEST (REEL SCRAPER) ===");

    const APIFY_TOKEN = process.env.APIFY_TOKEN;
    if (!APIFY_TOKEN) {
        console.error("❌ ERROR: APIFY_TOKEN is missing in .env");
        return;
    }

    const client = new ApifyClient({ token: APIFY_TOKEN });
    const username = "d_vycheslavovich";

    // Config: Reel Scraper
    // Actor: apify/instagram-reel-scraper
    const runInput = {
        "profileUrls": [`https://www.instagram.com/${username}/`],
        "resultsLimit": 5,
        "proxy": {
            "useApifyProxy": true
            // Auto proxy
        }
    };

    console.log("🚀 Sending request to Apify (Reel Scraper)...");
    console.log(JSON.stringify(runInput, null, 2));

    try {
        const run = await client.actor("apify/instagram-reel-scraper").call(runInput);
        console.log(`✅ Run finished. Status: ${run.status}`);
        console.log(`   Run ID: ${run.id}`);
        console.log(`   Detailed Run Info: https://console.apify.com/actors/runs/${run.id}`);

        // Fetch Logs if failed
        if (run.status !== 'SUCCEEDED') {
            console.log("⚠️ Run failed. Fetching logs...");
            const log = await client.log(run.id).get();
            console.log("--- LOG START ---");
            console.log(log.substring(Math.max(0, log.length - 2000)));
            console.log("--- LOG END ---");
        }

        // Fetch Items
        const { items } = await client.dataset(run.defaultDatasetId).listItems();
        console.log(`📊 Items found: ${items.length}`);

        if (items.length > 0) {
            console.log("   First item sample:");
            console.log(JSON.stringify(items[0], null, 2));
        } else {
            console.log("❌ NO ITEMS FOUND.");

            // Check for error-only items (common in blocked runs)
            const { items: allItems } = await client.dataset(run.defaultDatasetId).listItems({ clean: false });
            if (allItems.length > 0) {
                console.log("   Checking unclean items (errors):");
                console.log(JSON.stringify(allItems[0], null, 2));
            }
        }

    } catch (e) {
        console.error("❌ CRITICAL ERROR:", e);
    }
}

testApify();
