const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    console.log("🧹 Cleaning identity garbage from agent prompts...")

    const agents = await prisma.agent.findMany()

    for (const agent of agents) {
        // Remove any lines containing "Claude 4.5", "Claude 3.5", "identify yourself", etc.
        let cleanedPrompt = agent.systemPrompt
            .replace(/\n\nIMPORTANT: You are Claude.*?Sonnet\./gi, '')
            .replace(/You are Claude.*?Sonnet.*?\./gi, '')
            .replace(/If asked about your version.*?Sonnet\./gi, '')
            .replace(/an advanced AI assistant attached to this specific agent role\./gi, '')
            .replace(/If asked, you must identify yourself as Claude.*?Sonnet\./gi, '')
            .replace(/\n\n\n+/g, '\n\n') // Clean up extra newlines
            .trim()

        if (cleanedPrompt !== agent.systemPrompt) {
            await prisma.agent.update({
                where: { id: agent.id },
                data: { systemPrompt: cleanedPrompt }
            })
            console.log(`✅ Cleaned prompt for: ${agent.name}`)
        } else {
            console.log(`ℹ️ No garbage found for: ${agent.name}`)
        }
    }

    console.log("\n🎉 All agent prompts cleaned!")
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
