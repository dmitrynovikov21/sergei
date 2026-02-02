
import { scrapeInstagram } from "../lib/parser/apify-service";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
    const args = process.argv.slice(2);
    if (args.length < 1) {
        console.log("Usage: npx ts-node scripts/test_apify_scenarios.ts <username> [daysLimit]");
        process.exit(1);
    }

    const username = args[0];
    const daysLimit = args[1] ? parseInt(args[1]) : 7;

    console.log(`\n=== Testing Apify Integration for @${username} ===`);
    console.log(`Days Limit: ${daysLimit}`);

    try {
        console.log("Starting scrape...");
        const posts = await scrapeInstagram(username, 20, daysLimit);

        console.log(`\n✅ Scrape Successful!`);
        console.log(`Found ${posts.length} posts.`);

        if (posts.length > 0) {
            console.log("\nRecent posts:");
            posts.slice(0, 3).forEach(p => {
                console.log(`- [${p.timestamp.split('T')[0]}] ${p.url} (${p.type})`);
                if (p.caption) console.log(`  Caption: ${p.caption.substring(0, 50)}...`);
            });
        } else {
            console.warn("\n⚠️ No posts found. Account might be private, empty, or inactive in date range.");
        }

    } catch (error: any) {
        console.error("\n❌ Scrape Failed!");
        console.log("Error Message:", error.message);

        if (error.message.includes("Private Profile") || error.message.includes("Page Not Found")) {
            console.log("\n✅ Correctly identified invalid/private profile.");
        }
    }
}

main();
