
import { scrapeInstagram } from "@/lib/parser/apify-service";
// import { processPost } from "@/lib/parser/harvester"; // Removed as it is private
import * as dotenv from "dotenv";

dotenv.config();

// Mock database and source
const MOCK_SOURCE = {
    id: "test-source-id",
    url: "https://www.instagram.com/d_vycheslavovich/",
    type: "INSTAGRAM", // mapped to TRACKING_SOURCE_TYPE
    minViews: 10000,
    fetchLimit: 20,
    datasetId: "test-dataset-id"
};

async function main() {
    const username = "d_vycheslavovich";
    const daysLimit = 10;

    console.log(`\n=== Debugging Source: ${username} ===`);
    console.log(`Config: MinViews=${MOCK_SOURCE.minViews}, Days=${daysLimit}`);

    try {
        console.log("1. Fetching from Apify...");
        const posts = await scrapeInstagram(username, 20, daysLimit);
        console.log(`✅ Apify returned ${posts.length} raw posts.`);

        if (posts.length === 0) {
            console.log("❌ Stop: No posts found by Apify. Check username or privacy.");
            return;
        }

        console.log("\n2. Checking Filters:");
        let passed = 0;
        let skippedLowViews = 0;
        let skippedOld = 0;

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysLimit);

        for (const post of posts) {
            const postDate = new Date(post.timestamp);
            const views = post.videoViewCount || post.viewCount || post.playCount || 0;

            const isNewEnough = postDate >= cutoffDate;
            const isPopularEnough = views >= MOCK_SOURCE.minViews;

            console.log(`- Post ${post.url}:`);
            console.log(`  Date: ${post.timestamp} (${isNewEnough ? "OK" : "OLD"})`);
            console.log(`  Views (Calculated): ${views}`);

            // DUMP RAW DATA to find the real view count
            console.log("  [DEBUG] Raw Metrics:", JSON.stringify({
                videoViewCount: post.videoViewCount,
                playCount: post.playCount,
                viewCount: post.viewCount,
                videoPlayCount: post.videoPlayCount,
                likesCount: post.likesCount
            }, null, 2));

            if (views < 1000) {
                console.log("  [FULL OBJECT DUMP]:", JSON.stringify(post, null, 2));
            }

            if (!isNewEnough) skippedOld++;
            else if (!isPopularEnough) skippedLowViews++;
            else passed++;
        }

        console.log(`\n=== Summary ===`);
        console.log(`Total: ${posts.length}`);
        console.log(`Skipped (Old): ${skippedOld}`);
        console.log(`Skipped (Low Views < ${MOCK_SOURCE.minViews}): ${skippedLowViews}`);
        console.log(`Passed: ${passed}`);

    } catch (error) {
        console.error("❌ Error:", error);
    }
}

main();
