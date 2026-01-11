import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { ChatInterface } from "@/components/dashboard/chat-interface";
import { HeaderUpdater } from "@/components/dashboard/header-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default async function NewChatPage() {
    const session = await auth();
    if (!session?.user?.id) redirect("/login");

    const userId = session.user.id;

    // 1. Find or create "Claude Assistant" agent for simple chats
    let agent = await prisma.agent.findFirst({
        where: {
            userId,
            name: "Claude Assistant"
        }
    });

    // 2. If not found, create it
    if (!agent) {
        agent = await prisma.agent.create({
            data: {
                userId,
                name: "Claude Assistant",
                emoji: "✨",
                description: "Claude 4.5 Sonnet — самая совершенная модель для любых задач",
                systemPrompt: "You are Claude 4.5 Sonnet, a helpful AI assistant made by Anthropic. Be helpful, harmless, and honest.",
                model: "claude-4-5-sonnet"
            }
        });
    }

    // 3. Create chat and redirect immediately
    // This ensures we always have a valid chatId for the interface
    const { createChat } = await import("@/actions/chat");
    const chatId = await createChat(agent.id);
    redirect(`/dashboard/chat/${chatId}`);
}
