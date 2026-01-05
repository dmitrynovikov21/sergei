import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/session";
import {
  DashboardSidebar,
  MobileSheetSidebar,
} from "@/components/layout/dashboard-sidebar";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import { getFeaturedAgents } from "@/actions/agents";
import { HeaderProvider, HeaderDisplay } from "@/components/dashboard/header-context";

interface ProtectedLayoutProps {
  children: React.ReactNode;
}

export default async function Dashboard({ children }: ProtectedLayoutProps) {
  const user = await getCurrentUser();

  if (!user) redirect("/login");

  // Fetch data
  const starterAgents = await getFeaturedAgents();

  return (
    <HeaderProvider>
      <div className="relative flex h-screen w-full overflow-hidden">
        <DashboardSidebar
          agents={starterAgents}
          user={user}
        />

        {/* Main content wrapper with dark mode support */}
        <div className="flex flex-1 flex-col overflow-hidden bg-[#F9FAFB] dark:bg-[#0f0f0f]">
          <header className="flex-none flex h-14 px-4 lg:h-[60px] xl:px-8 bg-transparent">
            <MaxWidthWrapper className="flex max-w-7xl items-center gap-x-3 px-0">
              <MobileSheetSidebar
                agents={starterAgents}
              />

              <HeaderDisplay />
            </MaxWidthWrapper>
          </header>

          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </HeaderProvider>
  );
}
