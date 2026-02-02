import { PrismaClient } from "@prisma/client"
import { CreditManager } from "@/lib/services/credit-manager"

const prisma = new PrismaClient()

async function main() {
    const email = "dmitrynovikov21@gmail.com"
    const user = await prisma.user.findUnique({ where: { email } })

    if (!user) {
        console.error(`User ${email} not found`)
        return
    }

    console.log(`Adding credits to ${user.name} (${user.id})...`)

    await CreditManager.addCredits(user.id, 10000, "bonus", { note: "Initial seed" })

    const balance = await CreditManager.getBalance(user.id)
    console.log(`New balance: ${balance} credits`)
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
