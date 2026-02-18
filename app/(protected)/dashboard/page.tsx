import { getCurrentUser } from "@/lib/session";
import { constructMetadata } from "@/lib/utils";
import { getFeaturedAgents } from "@/actions/agents";
import { AgentGrid } from "@/components/dashboard/agent-grid";

export const metadata = constructMetadata({
  title: "Dashboard – AI Agents",
  description: "Select an agent to start.",
});

export default async function DashboardPage() {
  const user = await getCurrentUser();

  // Show agent selection (no auto-redirect to last chat)
  const agents = await getFeaturedAgents();

  return (
    <div className="flex h-full flex-col p-8 pt-16 overflow-y-auto">
      <div className="max-w-5xl w-full space-y-8">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Агенты
          </h1>
          <p className="text-sm text-muted-foreground">
            Выберите агента для создания контента
          </p>
        </div>

        <AgentGrid agents={agents} />
      </div>
    </div>
  );
}
