
const { ApifyClient } = require('apify-client');
require('dotenv').config({ path: '../.env' });

async function main() {
    const APIFY_TOKEN = process.env.APIFY_TOKEN;
    const client = new ApifyClient({ token: APIFY_TOKEN });

    // Dataset ID provided by user
    const datasetId = "cmkuqv25w0059k1hxkllkoqqo";
    // Wait, the user gave a DATASET ID from MY database, or from APIfy?
    // "dataset cmkuqv25w0059k1hxkllkoqqo" looks like a CUID from my DB (25 chars).
    // Apify dataset IDs are usually 17 chars.
    // I need to find the Apify dataset ID for this local dataset ID.
    // I'll assume for now I can't look it up easily without DB access.
    // I will list RECENT runs and checks which one corresponds to this.

    console.log("Fetching recent runs to analyze content types...");
    const runs = await client.runs().list({ desc: true, limit: 5 });

    for (const run of runs.items) {
        console.log(`Run: ${run.id}, Actor: ${run.actorId}, Dataset: ${run.defaultDatasetId}`);
        const dataset = await client.dataset(run.defaultDatasetId).listItems({ limit: 50 });
        const types = {};
        for (const item of dataset.items) {
            // Try to determine type
            let t = item.type;
            if (!t) {
                if (item.videoUrl || item.isVideo) t = 'Video/Reel';
                else if (item.images && item.images.length > 0) t = 'Carousel/Sidecar';
                else t = 'Image';
            }
            types[t] = (types[t] || 0) + 1;
        }
        console.log("  -> Content Types:", types);
    }
}

main().catch(console.error);
