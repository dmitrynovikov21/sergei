/**
 * CLEANUP SCRIPT
 * 
 * Deletes:
 * - All Chats (cascades to Messages, Attachments)
 * - All Datasets (cascades to Sources, ContentItems)
 * 
 * KEEPS:
 * - Users
 * - Agents
 * - Projects
 */

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function cleanup() {
    console.log("Starting cleanup...")

    // 1. Delete Chats
    const deletedChats = await prisma.chat.deleteMany({})
    console.log(`Deleted ${deletedChats.count} chats (and their messages/attachments)`)

    // 2. Delete Datasets 
    const deletedDatasets = await prisma.dataset.deleteMany({})
    console.log(`Deleted ${deletedDatasets.count} datasets (and their sources/items)`)

    console.log("Cleanup complete. Agents and Users preserved.")
}

cleanup()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
