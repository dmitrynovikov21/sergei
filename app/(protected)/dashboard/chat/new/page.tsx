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
                description: "Claude Sonnet — мощная модель для решения сложных задач",
                systemPrompt: "You are Claude, a helpful AI assistant made by Anthropic. Be helpful, harmless, and honest.",
                model: "sonnet"
            }
        });
    }

    // 3. Render interface WITHOUT creating chat in DB yet
    return (
        <div className="flex h-full flex-col overflow-hidden bg-[#F9FAFB] dark:bg-[#0f0f0f]">
            <HeaderUpdater
                title={agent.name}
                description={agent.description || "AI Ассистент"}
                icon={agent.emoji ? (
                    <span className="text-xl leading-none">
                        {agent.emoji}
                    </span>
                ) : (
                    <Avatar className="h-6 w-6">
                        <AvatarImage src={`https://avatar.vercel.sh/${agent.name}`} />
                        <AvatarFallback className="text-[10px]">{agent.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                )}
                // No settings or datasets for new chat yet
                settingsButton={null}
            />

            {/* Chat Interface - No chatId provided implies "New Chat" mode */}
            <ChatInterface
                initialMessages={[]}
                agentName={agent.name}
                agentIcon={agent.emoji}
                agent={agent}
            />
        </div>
    );
}
