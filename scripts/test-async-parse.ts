import { parseAllUserSources } from "../lib/parser/scheduler"
import { prisma } from "../lib/db"

async function main() {
    console.log("Testing async parser...")

    // Find a user with sources
    const user = await prisma.user.findFirst({
        where: {
            datasets: {
                some: {
                    sources: {
                        some: { isActive: true }
                    }
                }
            }
        }
    })

    if (!user) {
        console.log("No user with active sources found")
        return
    }

    console.log(`Found user: ${user.email} (${user.id})`)

    // Trigger parse
    const result = await parseAllUserSources(user.id)
    console.log("Parse triggered:", result)
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
