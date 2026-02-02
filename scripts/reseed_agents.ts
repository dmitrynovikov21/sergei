import { prisma } from "../lib/db"
import { seedUserAgents } from "../lib/seed-user-agents"

async function main() {
    console.log("Reseeding agents...")

    // Find the current user (assuming single user or first one)
    const user = await prisma.user.findFirst()

    if (!user) {
        console.log("No user found.")
        return
    }

    console.log(`Found user: ${user.email} (${user.id})`)

    // Run seed
    const result = await seedUserAgents(user.id)
    console.log("Seed result:", result)
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
