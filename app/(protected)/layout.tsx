import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import {
  DashboardSidebar,
  MobileSheetSidebar,
} from "@/components/layout/dashboard-sidebar";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import { getFeaturedAgents } from "@/actions/agents";
import { HeaderProvider, HeaderDisplay } from "@/components/dashboard/header-context";
import { EmailVerificationBanner } from "@/components/dashboard/email-verification-banner";

interface ProtectedLayoutProps {
  children: React.ReactNode;
}

export default async function Dashboard({ children }: ProtectedLayoutProps) {
  const sessionUser = await getCurrentUser();

  if (!sessionUser) redirect("/login");

  // Fetch fresh user data to get accurate credits
  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      credits: true,
      emoji: true,
      role: true, // Need role for sidebar logic if any
    }
  });

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

        {/* Main content - no header to prevent overlap */}
        <div className="flex flex-1 flex-col overflow-hidden bg-background">
          {/* Mobile menu toggle only */}
          <div className="flex-none h-10 px-4 items-center md:hidden flex">
            <MobileSheetSidebar agents={starterAgents} />
          </div>

          <main className="flex-1 overflow-y-auto overflow-x-hidden">
            <EmailVerificationBanner />
            {children}
          </main>
        </div>
      </div>
    </HeaderProvider>
  );
}
