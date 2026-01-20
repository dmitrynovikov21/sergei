import { notFound } from "next/navigation"
import Link from "next/link"
import { getAgentById } from "@/actions/agents"
import { getAgentChats } from "@/actions/chat"
import { AgentChatStarter } from "@/components/dashboard/agent/agent-chat-starter"
import { AgentChatHistory } from "@/components/dashboard/agent/agent-chat-history"
import { AgentRightPanel } from "@/components/dashboard/agent/agent-right-panel"
import { AgentHeader } from "@/components/dashboard/agent/agent-header"

interface AgentPageProps {
    params: {
        agentId: string
    }
}

export default async function AgentPage({ params }: AgentPageProps) {
    const [agent, chats] = await Promise.all([
        getAgentById(params.agentId),
        getAgentChats(params.agentId)
    ])

    if (!agent) {
        notFound()
    }

    return (
        <div className="flex justify-center min-h-screen py-8 px-4">
            {/* Container for both columns */}
            <div className="flex w-full max-w-5xl">
                {/* Center Column */}
                <div className="flex-1 flex flex-col px-6 max-w-2xl">
                    {/* Breadcrumb */}
                    <Link
                        href="/dashboard/agents"
                        className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white flex items-center gap-1 mb-8 transition-colors"
                    >
                        ← Все агенты
                    </Link>

                    {/* Title Row with Favorite */}
                    <AgentHeader agent={agent} />

                    {/* Chat Input */}
                    <AgentChatStarter agent={agent} />

                    {/* Chat History */}
                    <div className="mt-10">
                        <h3 className="text-sm font-medium text-zinc-500 mb-4 uppercase tracking-wider">История чатов</h3>
                        <AgentChatHistory chats={chats} />
                    </div>
                </div>

                {/* Right Panel - attached to content */}
                <AgentRightPanel agent={agent} />
            </div>
        </div>
    )
}
