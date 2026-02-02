const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    console.log("🚀 Starting forced model update to Claude 4.5 Sonnet...")

    // 1. Update all existing agents to use Claude 4.5 Sonnet
    const updateResult = await prisma.agent.updateMany({
        data: {
            model: "claude-sonnet-4-5"
        }
    })

    console.log(`✅ Updated ${updateResult.count} agents to use model 'claude-sonnet-4-5'`)

    // 2. Verify the update
    const agents = await prisma.agent.findMany({
        select: { name: true, model: true }
    })

    console.log("\n📊 Verification - Current Agent Models:")
    agents.forEach(agent => {
        console.log(`- ${agent.name}: [${agent.model}]`)
    })

    console.log("\n🎉 Model update completed successfully!")
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
