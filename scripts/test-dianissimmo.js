#!/usr/bin/env node
require('dotenv').config();
const { ApifyClient } = require('apify-client');

async function main() {
    const APIFY_TOKEN = process.env.APIFY_TOKEN;
    const IG_USERNAME = process.env.IG_USERNAME;
    const IG_PASSWORD = process.env.IG_PASSWORD;

    const client = new ApifyClient({ token: APIFY_TOKEN });
    const targetProfile = 'dianissimmo';

    console.log(`📱 Testing @${targetProfile} directly`);
    console.log('Auth:', IG_USERNAME ? 'Yes' : 'No');

    const input = {
        "directUrls": [`https://www.instagram.com/${targetProfile}/`],
        "resultsType": "posts",
        "resultsLimit": 50,
        "searchType": "user",
        "proxy": {
            "useApifyProxy": true,
            "apifyProxyGroups": ["RESIDENTIAL"]
        },
        "loginUsername": IG_USERNAME,
        "loginPassword": IG_PASSWORD
    };

    console.log('🚀 Starting...\n');

    try {
        const run = await client.actor("apify/instagram-scraper").call(input, {
            waitSecs: 300
        });

        console.log(`✅ Status: ${run.status}`);

        if (run.status === 'SUCCEEDED') {
            const { items } = await client.dataset(run.defaultDatasetId).listItems();
            const validItems = items.filter(i => !i.error);

            console.log(`📦 Total posts: ${validItems.length}`);

            if (validItems.length > 0) {
                console.log('\nFirst 3 posts:');
                validItems.slice(0, 3).forEach((item, i) => {
                    console.log(`${i + 1}. ${item.shortCode} - ${item.type || item.productType}`);
                });
            }
        } else {
            const log = await client.log(run.id).get();
            console.log('❌ Failed, log:', log?.substring(log.length - 500));
        }
    } catch (e) {
        console.error('❌ Error:', e.message);
    }
}

main().catch(console.error);
