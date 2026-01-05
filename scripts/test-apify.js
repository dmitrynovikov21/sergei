/**
 * Test script to verify Apify Instagram scraper returns full statistics
 * Run with: node scripts/test-apify.js <instagram_username>
 */

require('dotenv').config()

const APIFY_TOKEN = process.env.APIFY_TOKEN
const APIFY_ACTOR = "apify/instagram-scraper"

async function testScrape(username) {
    if (!APIFY_TOKEN) {
        console.error("❌ APIFY_TOKEN not found in .env")
        process.exit(1)
    }

    console.log(`\n🔍 Testing Apify Instagram scraper for @${username}`)
    console.log(`📦 Actor: ${APIFY_ACTOR}`)
    console.log(`🔑 Token: ${APIFY_TOKEN.slice(0, 10)}...`)
    console.log("\n⏳ Starting scrape...")

    const actorId = APIFY_ACTOR.replace("/", "~")
    const url = `https://api.apify.com/v2/acts/${actorId}/runs?token=${APIFY_TOKEN}`

    const input = {
        directUrls: [`https://www.instagram.com/${username}/`],
        resultsType: "posts",
        resultsLimit: 10,  // Small limit for testing
        addParentData: false,
        proxy: {
            useApifyProxy: true,
            apifyProxyGroups: ["RESIDENTIAL"]
        }
    }

    try {
        // Start the actor run
        const startResponse = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input)
        })

        if (!startResponse.ok) {
            throw new Error(`Apify start failed: ${await startResponse.text()}`)
        }

        const runData = await startResponse.json()
        const runId = runData.data.id
        console.log(`✅ Run started: ${runId}`)

        // Poll for completion
        let attempts = 0
        const maxAttempts = 60  // 5 minutes max

        while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 5000))
            process.stdout.write(`\r⏳ Polling... (${attempts + 1}/${maxAttempts})`)

            const statusResponse = await fetch(
                `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`
            )
            const statusData = await statusResponse.json()

            if (statusData.data.status === "SUCCEEDED") {
                console.log("\n✅ Run completed!")

                // Fetch results
                const resultsResponse = await fetch(
                    `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${APIFY_TOKEN}`
                )
                const results = await resultsResponse.json()

                console.log(`\n📊 Got ${results.length} items:\n`)

                // Analyze each item for stats
                results.forEach((item, index) => {
                    console.log(`\n--- Item ${index + 1} ---`)
                    console.log(`Type: ${item.type}`)
                    console.log(`URL: ${item.url}`)
                    console.log(`Caption: ${(item.caption || "").slice(0, 50)}...`)
                    console.log(`\n📈 STATISTICS:`)
                    console.log(`  likesCount: ${item.likesCount}`)
                    console.log(`  commentsCount: ${item.commentsCount}`)
                    console.log(`  videoViewCount: ${item.videoViewCount}`)
                    console.log(`  playCount: ${item.playCount}`)
                    console.log(`  viewCount: ${item.viewCount}`)
                    console.log(`  videoPlayCount: ${item.videoPlayCount}`)

                    // Log all keys to find any other view-related fields
                    const viewKeys = Object.keys(item).filter(k =>
                        k.toLowerCase().includes('view') ||
                        k.toLowerCase().includes('play') ||
                        k.toLowerCase().includes('count')
                    )
                    console.log(`\n🔑 Count-related fields: ${viewKeys.join(', ')}`)
                })

                // Save full response for analysis
                const fs = require('fs')
                fs.writeFileSync(
                    'scripts/apify-test-output.json',
                    JSON.stringify(results, null, 2)
                )
                console.log("\n💾 Full output saved to scripts/apify-test-output.json")

                return results
            }

            if (statusData.data.status === "FAILED" || statusData.data.status === "ABORTED") {
                throw new Error(`Apify run failed: ${statusData.data.status}`)
            }

            attempts++
        }

        throw new Error("Apify run timed out")

    } catch (error) {
        console.error("\n❌ Error:", error.message)
        process.exit(1)
    }
}

// Run the test
const username = process.argv[2] || "instagram"
testScrape(username)
