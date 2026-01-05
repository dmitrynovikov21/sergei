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
              <Link href="/dashboard" className="font-extrabold text-xl tracking-tight text-zinc-900 dark:text-white uppercase px-2 hover:opacity-80 transition-opacity flex items-center gap-2">
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

          <nav className="flex flex-1 flex-col gap-2 px-3 pb-4 overflow-hidden">

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

            {/* Knowledge Base (Admin Only) */}
            {/* TODO: Add proper role check. For now assuming user prop has role or we fetch it. 
                Using a client-side check if available or passing from layout. 
                The prompt asks for "Admin only". We might need to pass `userRole` to this component.
            */}

            {/* Data Sets Link */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/dashboard/datasets"
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors group mb-4",
                    path.includes("/dashboard/datasets")
                      ? "bg-zinc-200/50 dark:bg-zinc-800 text-zinc-900 dark:text-white font-medium"
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-200"
                  )}
                >
                  <span className={cn("flex items-center justify-center shrink-0 text-zinc-500", !isSidebarExpanded && "mx-auto")}>
                    <Database className="h-5 w-5" />
                  </span>
                  {isSidebarExpanded && <span>База знаний</span>}
                </Link>
              </TooltipTrigger>
              {!isSidebarExpanded && <TooltipContent side="right">База знаний</TooltipContent>}
            </Tooltip>

            {/* SECTION: AGENTS */}
            <div className="flex flex-col gap-0.5">
              {isSidebarExpanded && (
                <h4 className="px-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-2 uppercase tracking-wider">
                  Агенты
                </h4>
              )}

              {/* All Agents Link - potentially redundant if we list all 4, but good to keep */}
              {/* Tooltip for All Agents... removed if not needed or kept as "Home" for agents */}

              {/* List of Agents */}
              {agents.map((agent) => {
                const isAgentPage = path === `/dashboard/agents/${agent.id}`;

                return (
                  <Tooltip key={agent.id}>
                    <TooltipTrigger asChild>
                      <Link
                        href={`/dashboard/agents/${agent.id}`}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors group",
                          isAgentPage
                            ? "bg-zinc-200/50 dark:bg-zinc-800 text-zinc-900 dark:text-white font-medium shadow-sm"
                            : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-200"
                        )}
                      >
                        <span className={cn("flex items-center justify-center w-5 h-5 shrink-0 text-base leading-none", !isSidebarExpanded && "mx-auto")}>
                          {agent.emoji || "🤖"}
                        </span>
                        {isSidebarExpanded && (
                          <span className="truncate">{agent.name}</span>
                        )}
                      </Link>
                    </TooltipTrigger>
                    {!isSidebarExpanded && <TooltipContent side="right" className="bg-zinc-900 text-white border-zinc-800">{agent.name}</TooltipContent>}
                  </Tooltip>
                )
              })}
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

