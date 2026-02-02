
import fs from "fs"
import path from "path"

async function main() {
    console.log("Loading .env...")
    const envPath = path.resolve(process.cwd(), ".env")
    if (fs.existsSync(envPath)) {
        const envConfig = fs.readFileSync(envPath, "utf8")
        envConfig.split("\n").forEach(line => {
            const parts = line.split("=")
            if (parts.length >= 2) {
                const key = parts[0].trim()
                const val = parts.slice(1).join("=").trim()
                process.env[key] = val
            }
        })
    } else {
        console.error(".env file not found")
        return
    }

    console.log("APIFY_TOKEN present:", !!process.env.APIFY_TOKEN)

    console.log("Importing service...")
    const { scrapeInstagram } = await import("../lib/parser/apify-service")

    console.log("Starting debug scrape...")
    try {
        // Use a profile known to exist
        const posts = await scrapeInstagram("kostenkovru", 1)
        if (posts.length > 0) {
            console.log("First post keys:", Object.keys(posts[0]))
            console.log("First post full:", JSON.stringify(posts[0], null, 2))
        } else {
            console.log("No posts found")
        }
    } catch (error) {
        console.error("Error:", error)
    }
}

main()
