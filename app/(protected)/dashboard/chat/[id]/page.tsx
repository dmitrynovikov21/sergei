import { notFound, redirect } from "next/navigation";
import { constructMetadata } from "@/lib/utils";
import { getChat, createChat } from "@/actions/chat";
import { getAgentById, getAgentWithFiles } from "@/actions/agents";
import { auth } from "@/auth";
import { ChatInterface } from "@/components/dashboard/chat-interface";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { HeaderUpdater } from "@/components/dashboard/header-context";

interface ChatPageProps {
    params: {
        id: string;
    };
    searchParams: { [key: string]: string | string[] | undefined };
}

export async function generateMetadata({ params }: ChatPageProps) {
    const chat = await getChat(params.id);
    const title = chat ? `Chat with ${chat.agent.name}` : "Chat";

    return constructMetadata({
        title: `${title} – Platform`,
        description: "Chat interface.",
    });
}

export default async function ChatPage({ params, searchParams }: ChatPageProps) {
    // 1. Try to fetch the chat by ID
    let chat = await getChat(params.id);

    // 2. If not found, check if 'id' is actually an Agent ID (Start new chat flow)
    if (!chat) {
        const agent = await getAgentById(params.id);
        if (agent) {
            // Get datasetId from searchParams (passed from client with localStorage value)
            const datasetId = typeof searchParams.datasetId === 'string' ? searchParams.datasetId : undefined;
            // Create a new chat for this agent with optional datasetId
            const newChatId = await createChat(agent.id, undefined, datasetId);
            redirect(`/dashboard/chat/${newChatId}`);
        }

        // If neither chat nor agent, 404
        return notFound();
    }

    // Parallelize detailed data fetching and auth
    const [agentWithFiles, session] = await Promise.all([
        getAgentWithFiles(chat.agentId),
        auth()
    ]);

    const isOwner = session?.user?.id === agentWithFiles?.userId;
    const initialInput = typeof searchParams.init === 'string' ? searchParams.init : undefined;

    return (
        <div className="flex h-full flex-col overflow-hidden bg-[#F9FAFB] dark:bg-[#0f0f0f]">
            <HeaderUpdater
                title={chat.agent.name}
                href={`/dashboard/agents/${chat.agent.id}`}
                description={chat.agent.description || "AI Ассистент"}
                icon={chat.agent.emoji ? (
                    <span className="text-xl leading-none">
                        {chat.agent.emoji}
                    </span>
                ) : (
                    <Avatar className="h-6 w-6">
                        <AvatarImage src={`https://avatar.vercel.sh/${chat.agent.name}`} />
                        <AvatarFallback className="text-[10px]">{chat.agent.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                )}
            />

            {/* Chat Interface - No local header */}
            <ChatInterface
                chatId={chat.id}
                initialMessages={chat.messages as any}
                agentName={chat.agent.name}
                agentIcon={chat.agent.emoji}
                agent={chat.agent}
                initialInput={initialInput}
            />
        </div>
    );
}
