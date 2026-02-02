/**
 * Direct test script to verify Reels scraping works correctly
 * 
 * This bypasses the UI and tests the parser-service directly
 * 
 * Usage: node scripts/test-reels-direct.js
 */

const PARSER_SERVICE_URL = process.env.PARSER_SERVICE_URL || 'http://localhost:3001';

async function testReelsScraping() {
    console.log('='.repeat(60));
    console.log('🧪 DIRECT REELS SCRAPING TEST');
    console.log('='.repeat(60));

    const testConfig = {
        username: 'https://www.instagram.com/zahar__bz/reels/',
        limit: 100,
        daysLimit: 14,
        contentTypes: 'Video'  // ONLY Reels
    };

    console.log('\n📋 Test Configuration:');
    console.log(JSON.stringify(testConfig, null, 2));

    console.log('\n⏳ Sending request to parser-service...');
    console.log(`   URL: ${PARSER_SERVICE_URL}/api/scrape`);

    const startTime = Date.now();

    try {
        const response = await fetch(`${PARSER_SERVICE_URL}/api/scrape`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testConfig),
        });

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`\n⏱️  Response received in ${elapsed}s`);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`\n❌ HTTP Error ${response.status}:`);
            console.error(errorText);
            process.exit(1);
        }

        const data = await response.json();

        if (!data.success) {
            console.error(`\n❌ Parser Error: ${data.error}`);
            process.exit(1);
        }

        const posts = data.posts || [];

        console.log('\n' + '='.repeat(60));
        console.log('📊 RESULTS');
        console.log('='.repeat(60));
        console.log(`   Total items received: ${posts.length}`);

        // Analyze types
        const typeCounts = {};
        posts.forEach(p => {
            const type = p.type || 'Unknown';
            typeCounts[type] = (typeCounts[type] || 0) + 1;
        });

        console.log('\n   Content Types breakdown:');
        Object.entries(typeCounts).forEach(([type, count]) => {
            const emoji = type === 'Video' ? '🎬' : type === 'Sidecar' ? '📸' : type === 'Image' ? '🖼️' : '❓';
            console.log(`   ${emoji} ${type}: ${count}`);
        });

        // Check if we got ONLY Videos (Reels)
        const nonVideoCount = posts.filter(p => p.type !== 'Video').length;

        if (nonVideoCount > 0) {
            console.log(`\n⚠️  WARNING: Found ${nonVideoCount} non-Video items (should be 0 for Reels-only)`);
        } else {
            console.log('\n✅ SUCCESS: All items are Videos (Reels)!');
        }

        // Check date range
        const now = new Date();
        const cutoff = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

        const oldPosts = posts.filter(p => {
            const postDate = new Date(p.timestamp);
            return postDate < cutoff;
        });

        if (oldPosts.length > 0) {
            console.log(`\n⚠️  WARNING: ${oldPosts.length} posts are older than 14 days`);
        } else {
            console.log('✅ All posts are within 14 days range');
        }

        // Show sample
        if (posts.length > 0) {
            console.log('\n📝 Sample post:');
            const sample = posts[0];
            console.log(`   ID: ${sample.id || sample.shortCode}`);
            console.log(`   Type: ${sample.type}`);
            console.log(`   URL: ${sample.url}`);
            console.log(`   Views: ${sample.videoPlayCount || sample.playCount || sample.viewCount || 'N/A'}`);
            console.log(`   Likes: ${sample.likesCount}`);
            console.log(`   Date: ${sample.timestamp}`);
            console.log(`   Caption: ${sample.caption ? sample.caption.substring(0, 50) + '...' : 'N/A'}`);
        }

        console.log('\n' + '='.repeat(60));
        console.log('🏁 TEST COMPLETE');
        console.log('='.repeat(60));

    } catch (error) {
        console.error(`\n❌ FATAL ERROR: ${error.message}`);
        if (error.cause) {
            console.error(`   Cause: ${error.cause}`);
        }
        process.exit(1);
    }
}

testReelsScraping();
