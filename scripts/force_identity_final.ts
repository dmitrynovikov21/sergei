
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
    console.log("Starting ULTRA STRICT Force 4.5 migration...")

    // 1. Update all Agents to use claude-4-5-sonnet model
    const updateResult = await prisma.agent.updateMany({
        data: {
            model: "claude-4-5-sonnet"
        }
    })
    console.log(`Updated model for ${updateResult.count} agents.`)

    // 2. Fetch all agents to update prompts
    const agents = await prisma.agent.findMany()

    for (const agent of agents) {
        let prompt = agent.systemPrompt || ""

        // Remove old identity instructions
        prompt = prompt
            .replace(/Ты — Claude 3\.5 Sonnet\./g, "")
            .replace(/Ты — Claude 4\.5 Sonnet\./g, "")
            .replace(/You are Claude 3\.5 Sonnet\./g, "")
            .replace(/You are Claude 4\.5 Sonnet\./g, "")

        // Prepend STRICT identity
        const strictIdentity = "Ты — Claude 4.5 Sonnet (самая новая и мощная модель). Твоя база знаний актуальна на 2025 год.\n\n"

        if (!prompt.startsWith(strictIdentity.trim())) {
            prompt = strictIdentity + prompt.trim()
        }

        await prisma.agent.update({
            where: { id: agent.id },
            data: { systemPrompt: prompt }
        })
        console.log(`Updated prompt for agent: ${agent.name}`)
    }

    // 3. Update Chats to use new model (to be safe)
    // Note: Chat model is stored as string in Agent, but Chat might have overrides? 
    // Chat doesn't have model field in schema usually, it uses Agent's model. 
    // Let's check schema.
    // Schema says: Chat has NO model field. Good.

    console.log("Migration complete.")
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
