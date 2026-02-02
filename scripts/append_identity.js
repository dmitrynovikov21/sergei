const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    console.log("🆔 Standardizing Agent Identities...")

    const agents = await prisma.agent.findMany()
    const identityLine = "\n\nIMPORTANT: You are Claude 4.5 Sonnet, an advanced AI assistant attached to this specific agent role. If asked about your version or model, identify yourself as Claude 4.5 Sonnet."

    for (const agent of agents) {
        if (!agent.systemPrompt.includes("Claude 4.5 Sonnet")) {
            await prisma.agent.update({
                where: { id: agent.id },
                data: {
                    systemPrompt: agent.systemPrompt + identityLine
                }
            })
            console.log(`✅ Updated identity for: ${agent.name}`)
        } else {
            console.log(`ℹ️ Identity already present for: ${agent.name}`)
        }
    }

    console.log("\n🎉 All agents now know they are Claude 4.5 Sonnet!")
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
