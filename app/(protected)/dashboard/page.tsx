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
    <div className="flex h-full flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full text-center space-y-6">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white">
          Выберите агента для начала
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400">
          Нажмите на агента, чтобы начать новый чат
        </p>
        <div className="mt-8 space-y-6">
          <div className="flex justify-center">
            <ContextSelector datasets={datasets} />
          </div>
          <AgentGrid agents={agents} />
        </div>
      </div>
    </div>
  );
}
