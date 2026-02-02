
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
    console.log("Starting Identity Revert (Clean 4.5)...")

    // Fetch all agents
    const agents = await prisma.agent.findMany()
    console.log(`Checking ${agents.length} agents...`)

    for (const agent of agents) {
        let prompt = agent.systemPrompt || ""

        // Remove ANY injected "You are Claude..." lines (Russian or English)
        // We look for the patterns we added and potentially others

        const oldPrompt = prompt

        prompt = prompt
            .replace(/Ты — Claude 4\.5 Sonnet \(самая новая и мощная модель\)\. Твоя база знаний актуальна на 2025 год\.\n\n/g, "")
            .replace(/Ты — Claude 4\.5 Sonnet.*?\n\n/gs, "") // Catch-all for what we added
            .replace(/You are Claude 4\.5 Sonnet, a helpful AI assistant made by Anthropic\. Be helpful, harmless, and honest\./g, "You are Claude, a helpful AI assistant made by Anthropic. Be helpful, harmless, and honest.") // Revert default English prompt

        // Ensure model is still 4.5
        // We won't re-update model if it is already set, but we can enforce it just in case

        if (prompt !== oldPrompt) {
            await prisma.agent.update({
                where: { id: agent.id },
                data: {
                    systemPrompt: prompt,
                    model: "claude-4-5-sonnet" // Ensure model is 4.5
                }
            })
            console.log(`Cleaned prompt for agent: ${agent.name}`)
        } else {
            // Just enforce model if prompt was clean
            if (agent.model !== "claude-4-5-sonnet") {
                await prisma.agent.update({
                    where: { id: agent.id },
                    data: { model: "claude-4-5-sonnet" }
                })
                console.log(`Updated model ONLY for agent: ${agent.name}`)
            }
        }
    }

    console.log("Revert complete.")
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
