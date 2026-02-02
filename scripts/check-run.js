const { ApifyClient } = require('apify-client');
require('dotenv').config({ path: '.env' });

async function check() {
    try {
        const runId = process.argv[2];
        if (!runId) return console.log('Need Run ID');
        
        const client = new ApifyClient({ token: process.env.APIFY_TOKEN });
        const run = await client.run(runId).get();
        if (!run) return console.log('Run not found');
        console.log('Status:', run.status);
        
        const { items } = await client.dataset(run.defaultDatasetId).listItems();
        console.log('Items so far:', items.length);
    } catch(e) { console.error(e); }
}
check();
