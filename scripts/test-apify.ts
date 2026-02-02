
import "dotenv/config"
import { scrapeInstagram } from "../lib/parser/apify-service"

async function main() {
    console.log("Testing Apify...")
    try {
        const posts = await scrapeInstagram("kostenkovru", 10)
        console.log(`Success! Found ${posts.length} posts`)
        posts.forEach(p => console.log(`- ${p.timestamp}`))
    } catch (error) {
        console.error("Apify Error:", error)
    }
}

main()
