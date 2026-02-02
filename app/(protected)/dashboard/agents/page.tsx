import { getAgents } from "@/actions/agents";
import { AgentGrid } from "@/components/dashboard/agent-grid";
import { constructMetadata } from "@/lib/utils";

export const metadata = constructMetadata({
    title: "Агенты – Content Platform",
    description: "Выберите агента для создания контента.",
});

export default async function AgentsPage() {
    const agents = await getAgents();

    return (
        <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-6 py-16">
            <div className="w-full max-w-5xl space-y-12">
                {/* Header */}
                <div className="text-center space-y-3">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">
                        Агенты
                    </h1>
                    <p className="text-lg text-muted-foreground">
                        Выберите агента для начала работы
                    </p>
                </div>

                {/* Agent Grid */}
                <AgentGrid agents={agents} />
            </div>
        </div>
    );
}

