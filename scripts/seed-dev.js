const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const id = "clq1234560000abcde1234567" // Matching the ID in auth.config.ts
    const email = "dev@example.com"

    await prisma.user.upsert({
        where: { email },
        update: {
            id: id // Ensure ID matches
        },
        create: {
            id,
            email,
            name: "Dev User",
            role: "ADMIN",
            image: "https://avatar.vercel.sh/dev"
        }
    })
    console.log("Dev user seeded successfully")
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
