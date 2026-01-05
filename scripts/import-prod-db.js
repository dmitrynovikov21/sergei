const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()

// Helper to convert date strings back to Date objects
function fixDates(obj) {
    if (!obj) return obj

    // List of common date fields
    const dateFields = [
        'createdAt', 'updatedAt', 'emailVerified', 'expires_at',
        'expires', 'stripeCurrentPeriodEnd', 'publishedAt', 'lastScrapedAt'
    ]

    const newObj = { ...obj }
    for (const key of Object.keys(newObj)) {
        if (dateFields.includes(key) && newObj[key] && typeof newObj[key] === 'string') {
            newObj[key] = new Date(newObj[key])
        }
    }
    return newObj
}

async function main() {
    const dumpPath = path.join(__dirname, 'db-dump.json')
    console.log(`📦 Starting production import from: ${dumpPath}`)

    if (!fs.existsSync(dumpPath)) {
        console.error("❌ Dump file not found!")
        process.exit(1)
    }

    const data = JSON.parse(fs.readFileSync(dumpPath, 'utf8'))
    console.log("Data loaded. Cleaning existing database...")

    // ORDER MATTERS FOR DELETION (Child -> Parent)
    await prisma.contentItem.deleteMany()
    await prisma.attachment.deleteMany()
    await prisma.message.deleteMany()
    await prisma.chat.deleteMany()
    await prisma.agentFile.deleteMany()
    await prisma.trackingSource.deleteMany()
    // We keep datasets but delete items first
    await prisma.agent.deleteMany()
    await prisma.dataset.deleteMany()
    await prisma.project.deleteMany()
    await prisma.account.deleteMany()
    await prisma.session.deleteMany()
    await prisma.user.deleteMany()

    console.log("🧹 Database cleared.")
    console.log("🚀 Starting import...")

    // ORDER MATTERS FOR INSERTION (Parent -> Child)

    // 1. Users
    for (const item of data.users) {
        await prisma.user.create({ data: fixDates(item) })
    }
    console.log(`✅ Imported ${data.users.length} users`)

    // 2. Accounts
    for (const item of data.accounts) {
        await prisma.account.create({ data: fixDates(item) })
    }
    console.log(`✅ Imported ${data.accounts.length} accounts`)

    // 3. Projects
    for (const item of data.projects) {
        await prisma.project.create({ data: fixDates(item) })
    }
    console.log(`✅ Imported ${data.projects.length} projects`)

    // 4. Datasets
    for (const item of data.datasets) {
        await prisma.dataset.create({ data: fixDates(item) })
    }
    console.log(`✅ Imported ${data.datasets.length} datasets`)

    // 5. TrackingSources
    for (const item of data.trackingSources) {
        await prisma.trackingSource.create({ data: fixDates(item) })
    }
    console.log(`✅ Imported ${data.trackingSources.length} trackingSources`)

    // 6. Agents
    for (const item of data.agents) {
        await prisma.agent.create({ data: fixDates(item) })
    }
    console.log(`✅ Imported ${data.agents.length} agents`)

    // 7. AgentFiles
    for (const item of data.agentFiles) {
        await prisma.agentFile.create({ data: fixDates(item) })
    }
    console.log(`✅ Imported ${data.agentFiles.length} agentFiles`)

    // 8. Chats
    for (const item of data.chats) {
        await prisma.chat.create({ data: fixDates(item) })
    }
    console.log(`✅ Imported ${data.chats.length} chats`)

    // 9. Messages
    for (const item of data.messages) {
        await prisma.message.create({ data: fixDates(item) })
    }
    console.log(`✅ Imported ${data.messages.length} messages`)

    // 10. ContentItems
    // Use createMany? No, SQLite->Postgres IDs might be tricky if we don't force them. 
    // create() allows setting ID so it's fine.
    // However, createMany is faster. But let's use loop for safety with dates.
    let contentCount = 0
    for (const item of data.contentItems) {
        await prisma.contentItem.create({ data: fixDates(item) })
        contentCount++
    }
    console.log(`✅ Imported ${contentCount} contentItems`)

    console.log("\n🎉 IMPORT COMPLETE!")
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
