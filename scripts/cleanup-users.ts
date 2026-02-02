
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    try {
        console.log("Cleaning up database...");

        // Update agents set userId to null to avoid foreign key constraints failure if any
        // Depending on schema, agents might cascade delete or set null. 
        // Let's just delete users. If cascade is set, related data goes away.
        // If not, we might error. 
        // Usually user deletion cascades to accounts, sessions. 
        // Let's try raw delete of users.

        // First delete dependent records if not cascading
        await prisma.verificationToken.deleteMany();
        await prisma.account.deleteMany();
        await prisma.session.deleteMany();

        const deletedUsers = await prisma.user.deleteMany();

        console.log(`Deleted ${deletedUsers.count} users.`);
        console.log("Cleanup complete.");
    } catch (error) {
        console.error("Error cleaning up database:", error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
