import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { constructMetadata } from "@/lib/utils";
import { getUserChats } from "@/actions/chat";
import { getFeaturedAgents } from "@/actions/agents";
import { getDatasets } from "@/actions/datasets";
import { AgentGrid } from "@/components/dashboard/agent-grid";
import { ContextSelector } from "@/components/dashboard/context-selector";

export const metadata = constructMetadata({
  title: "Dashboard – AI Agents",
  description: "Select an agent to start.",
});

export default async function DashboardPage() {
  const user = await getCurrentUser();

  // Get user's recent chats
  const chats = await getUserChats();

  // If user has chats, redirect to the most recent one
  if (chats && chats.length > 0) {
    redirect(`/dashboard/chat/${chats[0].id}`);
  }

  // Otherwise show agent selection
  const agents = await getFeaturedAgents();
  const datasets = await getDatasets();

  return (
    <div className="flex h-full flex-col items-center p-8 pt-24 overflow-y-auto">
      <div className="max-w-5xl w-full text-center space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Выберите агента для начала
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Наши AI-агенты помогут вам с созданием контента. Выберите подходящего агента ниже, чтобы начать.
          </p>
        </div>

        <div className="space-y-8">
          <div className="flex justify-center">
            <ContextSelector datasets={datasets} />
          </div>
          <AgentGrid agents={agents} />
        </div>
      </div>
    </div>
  );
}
