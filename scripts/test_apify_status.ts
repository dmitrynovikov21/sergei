
import dotenv from "dotenv"
dotenv.config({ path: ".env" })

const APIFY_TOKEN = process.env.APIFY_TOKEN
// Use a very cheap/free actor
const ACTOR = "apify/hello-world"

async function test() {
    console.log(`Testing Apify Token: ${APIFY_TOKEN?.slice(0, 10)}...`)
    const url = `https://api.apify.com/v2/acts/${ACTOR.replace("/", "~")}/runs?token=${APIFY_TOKEN}`

    console.log("Starting Hello World run...")
    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
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
