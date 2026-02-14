"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  PanelLeftClose,
  PanelRightClose,
  Plus,
  Compass,
  Database,
  LayoutDashboard,
  CreditCard,
  Users,
  Gift,
  TrendingUp
} from "lucide-react";
import { Agent } from "@prisma/client";

import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MoreHorizontal } from "lucide-react";
import { Icons } from "@/components/shared/icons";
import { SidebarUser } from "./sidebar-user";
import { SidebarAgentLink } from "./SidebarAgentLink"; // Note: Filename case sensitivity
import { CreateAgentDialog } from "@/components/dashboard/create-agent-dialog";
import { FreeCreditsButton } from "./free-credits-button";

import { LucideIcon } from "lucide-react";

interface DashboardAgentLinkProps {
  href: string;
  active: boolean;
  icon: LucideIcon;
  children: React.ReactNode;
  isExpanded: boolean;
}

function DashboardAgentLink({ href, active, icon: Icon, children, isExpanded }: DashboardAgentLinkProps) {
  return (
    <div>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href={href}
            className={cn(
              "flex items-center gap-2 px-2 py-1.5 text-[15px] transition-all duration-200 rounded-[5px]",
              active
                ? "text-white font-medium bg-[#141413]/95"
                : "text-muted-foreground hover:text-white hover:bg-[#141413]/95"
            )}
          >
            <span className={cn("flex items-center justify-center shrink-0", !isExpanded ? "mx-auto" : "")}>
              <Icon className="h-4 w-4" strokeWidth={1.5} />
            </span>
            {isExpanded && <span>{children}</span>}
          </Link>
        </TooltipTrigger>
        {!isExpanded && <TooltipContent side="right">{children}</TooltipContent>}
      </Tooltip>
    </div>
  );
}

interface DashboardSidebarProps {
  agents: Agent[];
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string;
    credits?: number;
    emoji?: string | null;
  } | null;
}

export function DashboardSidebar({ agents, user }: DashboardSidebarProps) {
  const path = usePathname();
  const router = useRouter();
  const { isTablet } = useMediaQuery();
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(!isTablet);
  const [isPending, startTransition] = useTransition();

  const toggleSidebar = () => {
    setIsSidebarExpanded(!isSidebarExpanded);
  };

  // Helper to get display name for dedup
  const getDisplayName = (name: string) => {
    const n = name.toLowerCase()
    if (n.includes("заголовки reels")) return "reels_заголовки"
    if (n.includes("описание reels")) return "reels_описания"
    if (n.includes("заголовки каруселей")) return "carousel_заголовки"
    if (n.includes("структура карусел")) return "carousel_структура"
    return name // Keep original for other agents
  }

  // Deduplicate agents by display name to prevent visual duplicates
  const seenDisplayNames = new Set<string>()
  const uniqueAgents = agents.filter((a) => {
    const displayName = getDisplayName(a.name)
    if (seenDisplayNames.has(displayName)) return false
    seenDisplayNames.add(displayName)
    return true
  });

  React.useEffect(() => {
    setIsSidebarExpanded(!isTablet);
  }, [isTablet]);

  return (
    <TooltipProvider delayDuration={0}>
      <div className="sticky top-0 h-full">
        {/* Sidebar with dark mode support */}
        <aside
          className={cn(
            isSidebarExpanded ? "w-[280px]" : "w-[52px]",
            "hidden h-screen md:flex flex-col transition-all duration-300 ease-in-out border-r border-border/50 bg-background overflow-hidden",
          )}
        >
          {/* Toggle & Header Area */}
          <div className="flex h-12 items-center justify-between px-3 pt-1 mb-4">
            {isSidebarExpanded && (
              <Link href="/dashboard/agents" className="text-2xl font-black text-foreground tracking-tight hover:opacity-70 transition-opacity">
                ai content
              </Link>
            )}

            <Button
              variant="ghost"
              size="icon"
              className={cn("size-7 text-muted-foreground hover:text-foreground hover:bg-[#141413]/95 rounded-md transition-all duration-200", isSidebarExpanded ? "ml-auto" : "mx-auto")}
              onClick={toggleSidebar}
              title={isSidebarExpanded ? "Close sidebar" : "Open sidebar"}
            >
              {isSidebarExpanded ? (
                <PanelLeftClose size={20} strokeWidth={1.5} />
              ) : (
                <PanelRightClose size={20} strokeWidth={1.5} />
              )}
            </Button>
          </div>

          <nav className="flex flex-1 flex-col gap-0.5 px-2 pb-4 overflow-y-auto scrollbar-hide" style={{ scrollbarWidth: 'none' }}>

            {/* MAIN LINKS */}
            <div className="space-y-1">
              <DashboardAgentLink
                href="/dashboard/trends"
                active={path === "/dashboard/trends"}
                icon={TrendingUp}
                isExpanded={isSidebarExpanded}
              >
                Тренды
              </DashboardAgentLink>
            </div>
            <div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href="/dashboard/chat/new"
                    className={cn(
                      "flex items-center gap-2 px-2 py-1.5 text-[15px] transition-all duration-200 rounded-[5px]",
                      "text-muted-foreground hover:text-white hover:bg-[#141413]/95"
                    )}
                  >
                    <span className={cn("flex items-center justify-center shrink-0", !isSidebarExpanded ? "mx-auto" : "")}>
                      <Plus className="h-4 w-4" strokeWidth={1.5} />
                    </span>
                    {isSidebarExpanded && <span>Новый чат</span>}
                  </Link>
                </TooltipTrigger>
                {!isSidebarExpanded && <TooltipContent side="right">Создать чат</TooltipContent>}
              </Tooltip>
            </div>

            {/* KNOWLEDGE BASE */}
            <div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href="/dashboard/datasets"
                    className={cn(
                      "flex items-center gap-2 px-2 py-1.5 text-[15px] transition-all duration-200 rounded-[5px]",
                      path.startsWith("/dashboard/datasets")
                        ? "text-white font-medium bg-[#141413]/95"
                        : "text-muted-foreground hover:text-white hover:bg-[#141413]/95"
                    )}
                  >
                    <span className={cn("flex items-center justify-center shrink-0", !isSidebarExpanded ? "mx-auto" : "")}>
                      <Database className="h-4 w-4" strokeWidth={1.5} />
                    </span>
                    {isSidebarExpanded && <span>База знаний</span>}
                  </Link>
                </TooltipTrigger>
                {!isSidebarExpanded && <TooltipContent side="right">База знаний</TooltipContent>}
              </Tooltip>
            </div>

            {/* ADMIN GROUP */}
            <div className="flex flex-col gap-0 mt-6">
              {isSidebarExpanded && (
                <h4 className="px-2 text-[11px] font-medium text-muted-foreground/70 mb-1 uppercase tracking-wider">
                  Admin
                </h4>
              )}
              <DashboardAgentLink
                href="/dashboard/admin/users"
                active={path === "/dashboard/admin/users"}
                icon={Users}
                isExpanded={isSidebarExpanded}
              >
                Клиенты
              </DashboardAgentLink>
              <DashboardAgentLink
                href="/dashboard/admin/payouts"
                active={path === "/dashboard/admin/payouts"}
                icon={CreditCard}
                isExpanded={isSidebarExpanded}
              >
                Выплаты
              </DashboardAgentLink>
            </div>

            {/* REELS GROUP */}
            <div className="flex flex-col gap-0 mt-6">
              {isSidebarExpanded && (
                <h4 className="px-2 text-[11px] font-medium text-muted-foreground/70 mb-1 uppercase tracking-wider">
                  Reels
                </h4>
              )}
              {uniqueAgents
                .filter(a => {
                  const n = a.name.toLowerCase()
                  return n.includes("заголовки reels") || n.includes("описание reels") ||
                    n.includes("тренд") || n.includes("trend")
                })
                .sort((a, b) => {
                  // Order: Trends, Headlines, Description
                  const getRank = (name: string) => {
                    const n = name.toLowerCase()
                    if (n.includes("тренд") || n.includes("trend")) return 1
                    if (n.includes("заголовки") || n.includes("headlines")) return 2
                    if (n.includes("описание") || n.includes("description")) return 3
                    return 10
                  }
                  return getRank(a.name) - getRank(b.name)
                })
                .map((agent) => (
                  <SidebarAgentLink key={agent.id} agent={agent} path={path} isExpanded={isSidebarExpanded} />
                ))}
            </div>

            {/* CAROUSEL GROUP */}
            <div className="flex flex-col gap-0 mt-6">
              {isSidebarExpanded && (
                <h4 className="px-2 text-[11px] font-medium text-muted-foreground/70 mb-1 uppercase tracking-wider">
                  Carousels
                </h4>
              )}
              {uniqueAgents
                .filter(a => {
                  const n = a.name.toLowerCase()
                  return n.includes("заголовки каруселей") || n.includes("структура карусели") ||
                    n.includes("карусел headline") || n.includes("карусел structure")
                })
                .sort((a, b) => {
                  // Order: Headlines, Description, Create
                  const getRank = (name: string) => {
                    const n = name.toLowerCase()
                    if (n.includes("заголовки") || n.includes("headlines")) return 1
                    if (n.includes("описание") || n.includes("description")) return 2
                    if (n.includes("создать") || n.includes("create") || n.includes("структура")) return 3
                    return 10
                  }
                  return getRank(a.name) - getRank(b.name)
                })
                .map((agent) => (
                  <SidebarAgentLink key={agent.id} agent={agent} path={path} isExpanded={isSidebarExpanded} />
                ))}
            </div>

            {/* МОИ АГЕНТЫ - User's custom agents (excluding system Reels/Carousel agents) */}
            <div className="flex flex-col gap-0 mt-6">
              {isSidebarExpanded && (
                <div className="flex items-center justify-between px-2 mb-1">
                  <h4 className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-wider">
                    Мои агенты
                  </h4>
                  <CreateAgentDialog
                    trigger={
                      <button className="h-4 w-4 flex items-center justify-center text-muted-foreground/70 hover:text-foreground transition-colors">
                        <Plus className="h-3 w-3" strokeWidth={1.5} />
                      </button>
                    }
                  />
                </div>
              )}
              {uniqueAgents
                .filter(a => {
                  const n = a.name.toLowerCase()
                  // Exclude system Reels agents
                  const isReels = n.includes("заголовки reels") || n.includes("описание reels") ||
                    n.includes("тренд") || n.includes("trend")
                  // Exclude system Carousel agents  
                  const isCarousel = n.includes("заголовки каруселей") || n.includes("структура карусели")
                  // Only show user's custom agents that are not in system categories
                  return !a.isPublic && !isReels && !isCarousel
                })
                .map((agent) => (
                  <SidebarAgentLink key={agent.id} agent={agent} path={path} isExpanded={isSidebarExpanded} canDelete={true} />
                ))}
            </div>


          </nav>

          {/* Free Credits Button */}
          <div className="mt-auto px-3 pb-2">
            <FreeCreditsButton isExpanded={isSidebarExpanded} />
          </div>

          {/* User Profile at Bottom */}
          {user && (
            <div className="border-t border-border">
              <SidebarUser user={user} isExpanded={isSidebarExpanded} />
            </div>
          )}
        </aside>
      </div>
    </TooltipProvider >
  );
}

export function MobileSheetSidebar({ agents }: DashboardSidebarProps) {
  const [open, setOpen] = useState(false);
  const { isSm, isMobile } = useMediaQuery();

  if (!isSm && !isMobile) return null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="size-9 shrink-0 md:hidden"
        >
          <MoreHorizontal className="size-5" />
          <span className="sr-only">Toggle navigation menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="flex flex-col p-0 w-[300px]">
        <div className="flex flex-col gap-6 p-6">
          <Link href="/dashboard" onClick={() => setOpen(false)} className="flex items-center gap-2">
            <Icons.logo className="h-6 w-6" />
            <span className="font-bold text-lg uppercase">AI PLATFORM</span>
          </Link>

          <Link
            href="/dashboard/chat/new"
            onClick={() => setOpen(false)}
            className="flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold bg-foreground text-background"
          >
            <Plus className="h-5 w-5" />
            <span>Новый чат</span>
          </Link>

          {/* Agents */}
          <div className="flex flex-col gap-2">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Агенты</h4>

            <Link
              href="/dashboard/agents"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-2 py-2 hover:bg-zinc-800/50 rounded-md text-sm text-muted-foreground"
            >
              <Compass className="h-5 w-5 text-zinc-500" />
              <span>Все агенты</span>
            </Link>

            <Link
              href="/dashboard/datasets"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-2 py-2 hover:bg-zinc-800/50 rounded-md text-sm text-muted-foreground"
            >
              <Database className="h-5 w-5 text-zinc-500" />
              <span>База знаний</span>
            </Link>

            {agents.map(agent => (
              <Link
                key={agent.id}
                href={`/dashboard/agents/${agent.id}`}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-2 py-2 hover:bg-[#141413]/95 rounded-md text-sm text-muted-foreground hover:text-white transition-all duration-200"
              >
                <span>{agent.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

