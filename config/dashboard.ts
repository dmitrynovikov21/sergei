import { UserRole } from "@/lib/types";

import { SidebarNavItem } from "types";

export const sidebarLinks: SidebarNavItem[] = [
  {
    title: "TOP_ACTIONS", // Special section for New Chat, Search, Images
    items: [
      {
        href: "/dashboard/chat/new",
        icon: "edit",
        title: "Новый чат",
      },
      {
        href: "/dashboard/producer",
        icon: "bot",
        title: "Продюсер",
      },
    ],
  },
  {
    title: "GPTS",
    items: [], // Will be populated dynamically
  },
  {
    title: "PROJECTS",
    items: [
      {
        title: "Новый проект",
        href: "#",
        icon: "folderPlus",
      },
      {
        title: "личка/бизнес/развитие",
        href: "#",
        icon: "folder",
      },
      {
        title: "транскрибатор",
        href: "#",
        icon: "folder",
      },
    ],
  },
  {
    title: "HISTORY",
    items: [],
  },
];
