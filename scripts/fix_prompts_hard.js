const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    console.log("🔍 Scanning for outdated prompts...")
    const agents = await prisma.agent.findMany()

    const OLD_VARIANTS = [
        "=== НАСТРОЙКА ОПИСАНИЯ ===",
        "• Используй эмодзи в тексте",
        "Используй эмодзи в тексте"
    ]

    const NEW_TEXT = `
НАСТРОЙКИ ОПИСАНИЯ

ЭМОДЗИ: 
Добавляй в текст эмоджи, где это уместно, но без фанатизма. Например вместо пунктов в тексте, можно сделать соответствующие эмодзи, но если подразумевается нумерованный список, то сделай цифры, а не эмодзи.`

    let count = 0
    for (const agent of agents) {
        let prompt = agent.systemPrompt || ""
        let modified = false

        // Check if old text exists
        for (const old of OLD_VARIANTS) {
            if (prompt.includes(old)) {
                // Brutal replace
                prompt = prompt.split(old).join("")
                modified = true
            }
        }

        // Check if we need to add new text (only if we modified, or if it's missing and looks like descriptions agent)
        // User said "REPLACE IT EVERYWHERE".
        // But only for the specific agent? "Описание Reels".
        if ((agent.name === "Описание Reels" || modified) && !prompt.includes("Добавляй в текст эмоджи")) {
            prompt = prompt.trim() + "\n\n" + NEW_TEXT
            modified = true
        } else if (modified) {
            // If we removed old but new is already there, just save the cleanup
        }

        if (modified) {
            await prisma.agent.update({
                where: { id: agent.id },
                data: { systemPrompt: prompt }
            })
            console.log(`✅ Fixed agent: ${agent.name} (${agent.id})`)
            count++
        }
    }

    console.log(`\n🎉 Processed all agents. Fixed ${count} agents.`)
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
