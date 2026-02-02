
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import dotenv from "dotenv";

dotenv.config();

async function main() {
    console.log("Testing LiteLLM connection (DIRECT)...");
    const apiUrl = process.env.LITELLM_API_URL || "http://localhost:4000";
    const apiKey = process.env.LITELLM_MASTER_KEY || "sk-litellm-master-key";

    console.log("URL:", apiUrl);

    const litellm = createOpenAI({
        baseURL: `${apiUrl}/v1`,
        apiKey: apiKey,
    });

    try {
        console.log("Sending request to claude-sonnet-4-5-20250514...");
        const result = await generateText({
            model: litellm("claude-sonnet-4-5-20250514"),
            messages: [{ role: "user", content: "Hello! Just say OK." }],
        });

        console.log("Success!");
        console.log("Response:", result.text);
        console.log("Usage:", result.usage);
    } catch (error) {
        console.error("Test Failed:");
        console.error(error);
    }
}

main();
