
const { ApifyClient } = require('apify-client');
require('dotenv').config({ path: '../.env' });

async function main() {
    const APIFY_TOKEN = process.env.APIFY_TOKEN;
    if (!APIFY_TOKEN) {
        console.error("No APIFY_TOKEN found");
        return;
    }

    const client = new ApifyClient({ token: APIFY_TOKEN });

    // 1. Get last run
    console.log("Fetching last run...");
    const runs = await client.runs().list({ desc: true, limit: 1 });
    if (runs.items.length === 0) return;
    const lastRun = runs.items[0];

    console.log(`Run ID: ${lastRun.id} | Status: ${lastRun.status} | Dataset: ${lastRun.defaultDatasetId}`);

    // 2. Get dataset stats
    const dataset = await client.dataset(lastRun.defaultDatasetId).listItems();
    console.log(`Total items in Apify Dataset: ${dataset.items.length}`);

    // 3. Analyze items in dataset
    if (dataset.items.length > 0) {
        const types = {};
        const dates = [];

        dataset.items.forEach(item => {
            const t = item.type || (item.isVideo ? 'Video' : 'Image');
            types[t] = (types[t] || 0) + 1;
            if (item.timestamp) dates.push(new Date(item.timestamp));
        });

        console.log("Types breakdown:", types);

        if (dates.length > 0) {
            dates.sort((a, b) => a - b);
            console.log("Oldest post:", dates[0].toISOString());
            console.log("Newest post:", dates[dates.length - 1].toISOString());
        }

        // Check for specific "missing" items if possible (e.g. look for dates)
        console.log("Last 5 items dates:", dates.slice(-5).map(d => d.toISOString()));
    }
}

main().catch(console.error);
