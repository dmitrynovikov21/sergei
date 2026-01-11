
import dotenv from "dotenv"
dotenv.config({ path: ".env" })

const APIFY_TOKEN = process.env.APIFY_TOKEN
// Testing potentially free actor
const ACTOR = "apify/instagram-profile-scraper"

async function test() {
    console.log(`Testing Actor: ${ACTOR}`)
    const url = `https://api.apify.com/v2/acts/${ACTOR.replace("/", "~")}/runs?token=${APIFY_TOKEN}`

    const input = {
        usernames: ["instagram"],
    }

    console.log("Starting Profile Scraper run...")
    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input)
    })

    if (!response.ok) {
        console.error("Run Failed:", response.status, response.statusText)
        console.error(await response.text())
        return
    }

    const data = await response.json()
    console.log("Run started successfully!", data.data.id)
}

test()
