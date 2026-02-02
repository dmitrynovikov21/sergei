
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function inspectAgent(agentId: string) {
    console.log(`Inspecting agent: ${agentId}`)

    const agent = await prisma.agent.findUnique({
        where: { id: agentId },
        include: {
            files: true,
        }
    })

    if (!agent) {
        console.log("Agent not found!")
        return
    }

    console.log("=== AGENT DETAILS ===")
    console.log(`Name: ${agent.name}`)
    console.log(`System Prompt Length: ${agent.systemPrompt?.length || 0}`)
    console.log(`User Context Length: ${agent.userContext?.length || 0}`)
    console.log(`Files Count: ${agent.files.length}`)

    if (agent.files.length > 0) {
        console.log("=== FILES ===")
        agent.files.forEach(f => {
            console.log(`- ${f.name}: ${f.content.length} chars`)
        })
    }
}

const AGENT_ID = process.argv[2]
if (!AGENT_ID) {
    console.log("Please provide agent ID")
} else {
    inspectAgent(AGENT_ID)
        .catch(console.error)
        .finally(() => prisma.$disconnect())
}
