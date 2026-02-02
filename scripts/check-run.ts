
import "dotenv/config"

const RUN_ID = "lyUyqZMmmmFm3dNO8"
const APIFY_TOKEN = process.env.APIFY_TOKEN

async function main() {
    const url = `https://api.apify.com/v2/actor-runs/${RUN_ID}?token=${APIFY_TOKEN}`
    console.log("Checking run:", RUN_ID)

    const res = await fetch(url)
    const data = await res.json()

    console.log("Status:", data.data.status)
    console.log("Started at:", data.data.startedAt)
    console.log("Finished at:", data.data.finishedAt)
}

main()
