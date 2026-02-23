import { notFound } from "next/navigation";
import { constructMetadata } from "@/lib/utils";
import { getChat } from "@/actions/chat";
import { auth } from "@/auth";
import { ChatInterface } from "@/components/dashboard/chat-interface";

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

    // 2. If not found, return 404
    if (!chat) {
        return notFound();
    }

    const session = await auth();
    const initialInput = typeof searchParams.init === 'string' ? searchParams.init : undefined;

    return (
        <div className="flex h-full overflow-hidden bg-background">
            <div className="flex-1 flex flex-col min-w-0">
                <ChatInterface
                    chatId={chat.id}
                    initialMessages={chat.messages as any}
                    agentName={chat.agent.name}
                    agentIcon={chat.agent.emoji}
                    agent={chat.agent}
                    initialInput={initialInput}
                    initialDatasetId={(chat as any).datasetId}
                    userName={session?.user?.name?.split(' ')[0] || 'there'}
                />
            </div>
        </div>
    );
}
