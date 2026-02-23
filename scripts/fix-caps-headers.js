const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

(async () => {
    const agent = await p.agent.findUnique({
        where: { id: "cmkpetsp700034o2v1o755wd8" },
        select: { systemPrompt: true }
    });

    // Fix: "ЗАГОЛОВОК ПУНКТА" → "Заголовок пункта" (no all-caps)
    let prompt = agent.systemPrompt;

    // Replace the format section that instructs all-caps headers
    prompt = prompt.replace(
        `ФОРМАТ ТЕКСТА — нумерованный список с пояснениями:
1. ЗАГОЛОВОК ПУНКТА
Краткое пояснение на 2-3 предложения.

2. СЛЕДУЮЩИЙ ПУНКТ
Пояснение...

И так далее до 7-8 пунктов. Заключение с выводом и CTA.`,

        `ФОРМАТ ТЕКСТА — нумерованный список с пояснениями:
1. Заголовок пункта (НЕ пиши заголовки КАПСОМ, используй обычный регистр)
Краткое пояснение на 2-3 предложения.

2. Следующий пункт
Пояснение...

И так далее до 7-8 пунктов. Заключение с выводом и CTA.`
    );

    const result = await p.agent.update({
        where: { id: "cmkpetsp700034o2v1o755wd8" },
        data: { systemPrompt: prompt }
    });

    console.log("Updated. Prompt length:", result.systemPrompt.length);
    console.log("Contains КАПСОМ instruction:", result.systemPrompt.includes("КАПСОМ"));
    await p.$disconnect();
})();
