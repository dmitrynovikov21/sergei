/**
 * Resolve 96 unknown sources using Apify Instagram scraper
 * Uses the same scraper that's already configured in the project
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DATASET_50K = '1ac12945-7926-4409-a36a-6b1b6d35dcb6';
const MAIN_DATASET = '88fc98e8-3072-4b02-b498-429403ef0750';

// Get Apify token from .env
require('dotenv').config();
const APIFY_TOKEN = process.env.APIFY_TOKEN;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    if (!APIFY_TOKEN) {
        console.error('No APIFY_API_TOKEN in .env');
        process.exit(1);
    }

    console.log('Apify token found:', APIFY_TOKEN.slice(0, 10) + '...');

    // Get broken items
    const brokenItems = await prisma.contentItem.findMany({
        where: {
            datasetId: DATASET_50K,
            sourceUrl: { contains: '/p/' }
        },
        select: { id: true, originalUrl: true, instagramId: true }
    });

    console.log(`\n${brokenItems.length} items with unknown source`);

    // Collect unique URLs
    const urls = [...new Set(brokenItems.map(i => i.originalUrl))];
    console.log(`${urls.length} unique post URLs to resolve`);

    // Run Apify Instagram Post scraper with all URLs
    console.log('Starting Apify post scraper...');

    const runResponse = await fetch(
        `https://api.apify.com/v2/acts/apify~instagram-post-scraper/runs`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${APIFY_TOKEN}`
            },
            body: JSON.stringify({
                directUrls: urls,
                resultsLimit: urls.length
            })
        }
    );

    if (!runResponse.ok) {
        const text = await runResponse.text();
        console.error('Apify run failed:', runResponse.status, text);
        process.exit(1);
    }

    const runData = await runResponse.json();
    const runId = runData.data.id;
    console.log(`Run started: ${runId}`);

    // Poll for completion
    let status = 'RUNNING';
    while (status === 'RUNNING' || status === 'READY') {
        await sleep(5000);
        const statusResp = await fetch(
            `https://api.apify.com/v2/actor-runs/${runId}`,
            { headers: { 'Authorization': `Bearer ${APIFY_TOKEN}` } }
        );
        const statusData = await statusResp.json();
        status = statusData.data.status;
        console.log(`Status: ${status}`);
    }

    if (status !== 'SUCCEEDED') {
        console.error('Run failed with status:', status);
        process.exit(1);
    }

    // Get results
    const datasetId = runData.data.defaultDatasetId;
    const resultsResp = await fetch(
        `https://api.apify.com/v2/datasets/${datasetId}/items?format=json`,
        { headers: { 'Authorization': `Bearer ${APIFY_TOKEN}` } }
    );

    const results = await resultsResp.json();
    console.log(`\nGot ${results.length} results from Apify`);

    // Build URL -> ownerUsername map
    const ownerMap = {};
    results.forEach(post => {
        if (post.ownerUsername && post.url) {
            ownerMap[post.url] = post.ownerUsername;
        }
        // Also map by shortCode
        if (post.ownerUsername && post.shortCode) {
            ownerMap[post.shortCode] = post.ownerUsername;
        }
    });

    console.log(`Owner map entries: ${Object.keys(ownerMap).length}`);

    // Update items
    let fixed = 0;
    for (const item of brokenItems) {
        const owner = ownerMap[item.originalUrl];
        if (owner) {
            await prisma.contentItem.update({
                where: { id: item.id },
                data: { sourceUrl: `https://instagram.com/${owner}` }
            });

            // Also fix main dataset
            const originalId = item.instagramId.replace('_50k', '');
            await prisma.contentItem.updateMany({
                where: { instagramId: originalId, datasetId: MAIN_DATASET },
                data: { sourceUrl: `https://instagram.com/${owner}` }
            });

            fixed++;
        }
    }

    console.log(`\nFixed: ${fixed}/${brokenItems.length}`);

    // Print distribution
    const allItems = await prisma.contentItem.findMany({
        where: { datasetId: DATASET_50K },
        select: { sourceUrl: true }
    });

    const sourceMap = {};
    allItems.forEach(i => {
        let u = 'unknown';
        if (i.sourceUrl) {
            const match = i.sourceUrl.match(/instagram\.com\/([^\/]+)/);
            if (match && match[1] !== 'p' && match[1] !== 'reel') u = match[1];
        }
        sourceMap[u] = (sourceMap[u] || 0) + 1;
    });

    console.log('\n=== Final Source Distribution ===');
    Object.entries(sourceMap).sort((a, b) => b[1] - a[1]).forEach(([u, c]) => {
        console.log(`@${u}: ${c}`);
    });

    await prisma.$disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
