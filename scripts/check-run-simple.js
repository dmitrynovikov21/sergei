const { ApifyClient } = require('apify-client');
require('dotenv').config({ path: '.env' });
const fs = require('fs');

async function check() {
    try {
        const runId = 'Svd2xwiZWYfNLgDcx';
        const client = new ApifyClient({ token: process.env.APIFY_TOKEN });

        const run = await client.run(runId).get();
        const { items } = await client.dataset(run.defaultDatasetId).listItems();

        const info = `Run Status: ${run.status}\nItems: ${items.length}\nLast Update: ${run.lastModified}`;
        console.log(info);
        fs.writeFileSync('scripts/run-status.txt', info);
    } catch (e) {
        fs.writeFileSync('scripts/run-status.txt', 'Error: ' + e.message);
    }
}
check();
