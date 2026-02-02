const Anthropic = require("@anthropic-ai/sdk")

const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
})

async function main() {
    console.log("🧪 Testing direct API call to claude-sonnet-4-5-20250929...")
    console.log("Question: Какая ты модель Claude? Назови свою точную версию.\n")

    const response = await client.messages.create({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 1024,
        messages: [
            { role: "user", content: "Какая ты модель Claude? Назови свою точную версию." }
        ]
    })

    console.log("=== RESPONSE ===")
    console.log(response.content[0].text)
    console.log("\n=== MODEL USED ===")
    console.log("Requested:", "claude-sonnet-4-5-20250929")
    console.log("Response Model:", response.model)
}

main().catch(console.error)
