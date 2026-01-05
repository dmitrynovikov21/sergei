const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()

async function main() {
    console.log("📦 Starting local database export...")

    // 1. Users
    const users = await prisma.user.findMany()
    console.log(`Found ${users.length} users`)

    // 2. Accounts
    const accounts = await prisma.account.findMany()
    console.log(`Found ${accounts.length} accounts`)

    // 3. Projects
    const projects = await prisma.project.findMany()
    console.log(`Found ${projects.length} projects`)

    // 4. Datasets
    const datasets = await prisma.dataset.findMany()
    console.log(`Found ${datasets.length} datasets`)

    // 5. TrackingSources
    const trackingSources = await prisma.trackingSource.findMany()
    console.log(`Found ${trackingSources.length} trackingSources`)

    // 6. Agents
    const agents = await prisma.agent.findMany()
    console.log(`Found ${agents.length} agents`)

    // 7. AgentFiles
    const agentFiles = await prisma.agentFile.findMany()
    console.log(`Found ${agentFiles.length} agentFiles`)

    // 8. Chats
    const chats = await prisma.chat.findMany()
    console.log(`Found ${chats.length} chats`)

    // 9. Messages
    const messages = await prisma.message.findMany()
    console.log(`Found ${messages.length} messages`)

    // 10. ContentItems
    const contentItems = await prisma.contentItem.findMany()
    console.log(`Found ${contentItems.length} contentItems`)


    const dump = {
        users,
        accounts,
        projects,
        datasets,
        trackingSources,
        agents,
        agentFiles,
        chats,
        messages,
        contentItems
    }

    const outputPath = path.join(__dirname, 'db-dump.json')
    fs.writeFileSync(outputPath, JSON.stringify(dump, null, 2))

    console.log(`\n✅ Database exported to: ${outputPath}`)
    console.log(`Total size: ${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB`)
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
