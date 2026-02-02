require('dotenv').config({ path: '.env' });
const { scrapeInstagram } = require('../parser-service/lib/apify');

async function test() {
    console.log('--- MANUAL APIFY TEST ---');
    const URL = 'https://www.instagram.com/dianissimmo/reels/';
    // const URL = 'https://www.instagram.com/dianissimmo/'; 

    console.log(`Target: ${URL}`);

    try {
        const items = await scrapeInstagram(URL, 1000, 30); // 1000 limit, 30 days logic (ignored in new code)

        console.log(`\nTotal Items Returned: ${items.length}`);

        if (items.length === 0) {
            console.log('No items found.');
            return;
        }

        // Analyze Dates
        const now = new Date();
        const cutoff14 = new Date(now - 14 * 24 * 60 * 60 * 1000);

        let count14 = 0;
        let oldestDate = new Date();
        let newestDate = new Date(0);

        items.forEach(item => {
            const date = new Date(item.timestamp || item.date || item.takenAt); // Adjust field name based on output
            if (date > newestDate) newestDate = date;
            if (date < oldestDate) oldestDate = date;

            if (date >= cutoff14) {
                count14++;
            }
        });

        console.log(`\n--- Stats ---`);
        console.log(`Newest Post: ${newestDate.toISOString()}`);
        console.log(`Oldest Post: ${oldestDate.toISOString()}`);
        console.log(`Items in last 14 days (>= ${cutoff14.toISOString()}): ${count14}`);

        console.log(`\nCompare with user expectation: ~120 items in last 14 days.`);

    } catch (e) {
        console.error('Test Failed:', e);
    }
}

test();
