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
  Database
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

interface DashboardSidebarProps {
  agents: Agent[];
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string;
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

  React.useEffect(() => {
    setIsSidebarExpanded(!isTablet);
  }, [isTablet]);

  return (
    <TooltipProvider delayDuration={0}>
      <div className="sticky top-0 h-full">
        {/* Sidebar with dark mode support */}
        <aside
          className={cn(
            isSidebarExpanded ? "w-[260px]" : "w-[60px]",
            "hidden h-screen md:flex flex-col transition-all duration-300 ease-in-out border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50",
          )}
        >
          {/* Toggle & Header Area */}
          <div className="flex h-14 items-center justify-between px-3 pt-2 mb-6">
            {isSidebarExpanded && (
              <Link href="/dashboard/agents" className="font-extrabold text-xl tracking-tight text-zinc-900 dark:text-white uppercase px-2 hover:opacity-80 transition-opacity flex items-center gap-2">
                <Icons.logo className="h-6 w-6" />
                <span>AI PLATFORM</span>
              </Link>
            )}

            <Button
              variant="ghost"
              size="icon"
              className={cn("size-8 text-zinc-500 hover:text-black dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800", isSidebarExpanded ? "ml-auto" : "mx-auto")}
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

          <nav className="flex flex-1 flex-col gap-2 px-3 pb-4 overflow-y-auto">

            {/* CREATE CLAUDE CHAT BUTTON */}
            <div className="mb-6">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href="/dashboard/chat/new"
                    className={cn(
                      "flex items-center gap-2 rounded-xl px-3 py-3 text-sm transition-all group shadow-sm hover:shadow-md",
                      "bg-gradient-to-br from-zinc-900 to-zinc-800 text-white hover:from-black hover:to-zinc-900",
                      "dark:from-white dark:to-zinc-200 dark:text-black dark:hover:from-zinc-100 dark:hover:to-zinc-300"
                    )}
                  >
                    <span className={cn("flex items-center justify-center shrink-0", !isSidebarExpanded ? "mx-auto" : "")}>
                      <Plus className="h-5 w-5" />
                    </span>
                    {isSidebarExpanded && <span className="font-semibold">Новый чат</span>}
                  </Link>
                </TooltipTrigger>
                {!isSidebarExpanded && <TooltipContent side="right">Создать чат</TooltipContent>}
              </Tooltip>
            </div>

            {/* KNOWLEDGE BASE */}
            <div className="mb-6 px-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href="/dashboard/datasets"
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-2 py-2 text-sm transition-all text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800",
                      path.startsWith("/dashboard/datasets") && "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white"
                    )}
                  >
                    <span className={cn("flex items-center justify-center shrink-0", !isSidebarExpanded ? "mx-auto" : "")}>
                      <Database className="h-5 w-5" />
                    </span>
                    {isSidebarExpanded && <span className="font-medium">База знаний</span>}
                  </Link>
                </TooltipTrigger>
                {!isSidebarExpanded && <TooltipContent side="right">База знаний</TooltipContent>}
              </Tooltip>
            </div>

            {/* REELS GROUP */}
            <div className="flex flex-col gap-1 mb-6">
              {isSidebarExpanded && (
                <h4 className="px-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-2 uppercase tracking-wider">
                  Reels
                </h4>
              )}
              {agents
                .filter(a => {
                  const n = a.name.toLowerCase()
                  return n.includes("тренд") || n.includes("trend") ||
                    (n.includes("reels") && (n.includes("заголовки") || n.includes("headlines"))) ||
                    (n.includes("reels") && (n.includes("описание") || n.includes("description")))
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
            <div className="flex flex-col gap-1">
              {isSidebarExpanded && (
                <h4 className="px-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-2 uppercase tracking-wider">
                  Carousels
                </h4>
              )}
              {agents
                .filter(a => {
                  const n = a.name.toLowerCase()
                  return (n.includes("карусел") || n.includes("carousel")) &&
                    (n.includes("заголовки") || n.includes("headlines") ||
                      n.includes("описание") || n.includes("description") ||
                      n.includes("создать") || n.includes("create") || n.includes("структура"))
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

            {/* МОИ АГЕНТЫ - User's custom agents */}
            {agents.filter(a => !a.isPublic).length > 0 && (
              <div className="flex flex-col gap-1 mt-6">
                {isSidebarExpanded && (
                  <h4 className="px-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-2 uppercase tracking-wider">
                    Мои агенты
                  </h4>
                )}
                {agents
                  .filter(a => !a.isPublic)
                  .map((agent) => (
                    <SidebarAgentLink key={agent.id} agent={agent} path={path} isExpanded={isSidebarExpanded} />
                  ))}
              </div>
            )}

            {/* CREATE AGENT BUTTON */}
            <div className="mt-6 px-1">
              {isSidebarExpanded ? (
                <CreateAgentDialog
                  trigger={
                    <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors border border-dashed border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500">
                      <Plus className="h-4 w-4" />
                      <span>Создать агента</span>
                    </button>
                  }
                />
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <CreateAgentDialog
                      trigger={
                        <button className="mx-auto flex items-center justify-center h-9 w-9 rounded-lg text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                          <Plus className="h-5 w-5" />
                        </button>
                      }
                    />
                  </TooltipTrigger>
                  <TooltipContent side="right">Создать агента</TooltipContent>
                </Tooltip>
              )}
            </div>
          </nav>

          {/* User Profile at Bottom */}
          {user && (
            <div className="mt-auto border-t border-zinc-200 dark:border-zinc-800 p-3">
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
            className="flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold bg-zinc-900 text-white"
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
              className="flex items-center gap-3 px-2 py-2 hover:bg-zinc-100 rounded-md text-sm"
            >
              <Compass className="h-5 w-5 text-zinc-500" />
              <span>Все агенты</span>
            </Link>

            <Link
              href="/dashboard/datasets"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-2 py-2 hover:bg-zinc-100 rounded-md text-sm"
            >
              <Database className="h-5 w-5 text-zinc-500" />
              <span>База знаний</span>
            </Link>

            {agents.map(agent => (
              <Link
                key={agent.id}
                href={`/dashboard/agents/${agent.id}`}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-2 py-2 hover:bg-zinc-100 rounded-md text-sm"
              >
                <span className="text-xl">{agent.emoji || "🤖"}</span>
                <span>{agent.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

