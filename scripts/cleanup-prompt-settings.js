const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

(async () => {
    // 1. Clean settings block from ALL agent systemPrompts
    const agents = await p.agent.findMany({
        where: { systemPrompt: { contains: "НАСТРОЙКИ ОПИСАНИЯ" } },
        select: { id: true, name: true, systemPrompt: true }
    });
    console.log("Found", agents.length, "agents with settings block");
    for (const a of agents) {
        const h = "--- НАСТРОЙКИ ОПИСАНИЯ (АВТОМАТИЧЕСКИЕ) ---";
        const f = "--- КОНЕЦ НАСТРОЕК ---";
        const si = a.systemPrompt.indexOf(h);
        const ei = a.systemPrompt.indexOf(f);
        if (si !== -1 && ei !== -1) {
            const clean = a.systemPrompt.substring(0, si).trim();
            await p.agent.update({ where: { id: a.id }, data: { systemPrompt: clean } });
            console.log("Cleaned:", a.id, a.name);
        }
    }

    // 2. Clear audienceQuestion that equals hardcoded default
    const q = await p.agent.updateMany({
        where: { audienceQuestion: "Какая у вас ниша?" },
        data: { audienceQuestion: "" }
    });
    console.log("Cleared hardcoded audienceQuestion:", q.count);

    await p.$disconnect();
})();
