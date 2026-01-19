const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    console.log("🧹 Cleaning production database for client handoff...")

    // 1. Delete all attachments first (due to foreign key constraints)
    const attachmentsDeleted = await prisma.attachment.deleteMany({})
    console.log(`✅ Deleted ${attachmentsDeleted.count} attachments`)

    // 2. Delete all messages
    const messagesDeleted = await prisma.message.deleteMany({})
    console.log(`✅ Deleted ${messagesDeleted.count} messages`)

    // 3. Delete all chats
    const chatsDeleted = await prisma.chat.deleteMany({})
    console.log(`✅ Deleted ${chatsDeleted.count} chats`)

    // 4. Delete content items
    const contentDeleted = await prisma.contentItem.deleteMany({})
    console.log(`✅ Deleted ${contentDeleted.count} content items`)

    // 5. Delete parse history
    const historyDeleted = await prisma.parseHistory.deleteMany({})
    console.log(`✅ Deleted ${historyDeleted.count} parse history records`)

    // 6. Delete tracking sources
    const sourcesDeleted = await prisma.trackingSource.deleteMany({})
    console.log(`✅ Deleted ${sourcesDeleted.count} tracking sources`)

    // 7. Delete datasets
    const datasetsDeleted = await prisma.dataset.deleteMany({})
    console.log(`✅ Deleted ${datasetsDeleted.count} datasets`)

    console.log("\n🎉 Production database cleaned! Ready for client testing.")
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
