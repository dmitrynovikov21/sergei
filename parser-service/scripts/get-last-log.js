
const { ApifyClient } = require('apify-client');
require('dotenv').config({ path: '../.env' }); // Load from root .env

async function main() {
    const APIFY_TOKEN = process.env.APIFY_TOKEN;
    if (!APIFY_TOKEN) {
        console.error("No APIFY_TOKEN found");
        return;
    }

    const client = new ApifyClient({ token: APIFY_TOKEN });

    // 1. List recent runs to find one
    console.log("Fetching recent runs...");
    const runs = await client.runs().list({ desc: true, limit: 1 });

    if (runs.items.length === 0) {
        console.log("No runs found.");
        return;
    }

    const lastRun = runs.items[0];
    console.log(`Last Run ID: ${lastRun.id} (Status: ${lastRun.status})`);

    // 2. Get log
    console.log("Fetching log...");
    const log = await client.log(lastRun.id).get();

    console.log("\n--- RAW APIFY LOG START ---");
    console.log(log);
    console.log("--- RAW APIFY LOG END ---\n");
}

main().catch(console.error);
