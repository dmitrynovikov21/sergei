"use client"

import { useState } from "react"
import { useTheme } from "next-themes"
import { signOut } from "next-auth/react"
import { User } from "next-auth"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
    DropdownMenuPortal,
} from "@/components/ui/dropdown-menu"
import {
    Settings,
    Sun,
    Moon,
    Monitor,
    HelpCircle,
    LogOut,
    ChevronUp,
    Coins,
    CreditCard,
    Gift
} from "lucide-react"
import Link from "next/link"

interface SidebarUserProps {
    user: {
        name?: string | null
        email?: string | null
        image?: string | null
        credits?: number
        emoji?: string | null
    }
    isExpanded: boolean
}

export function SidebarUser({ user, isExpanded }: SidebarUserProps) {
    const { setTheme, theme } = useTheme()
    const [open, setOpen] = useState(false)

    const emojiRegex = /(\p{Emoji_Presentation}|\p{Extended_Pictographic})/u
    const DEFAULT_EMOJI = "🎯" // Default emoji for users without custom one

    // Extract emoji from name if present, or use DB emoji
    let displayEmoji = user.emoji
    let displayName = user.name || "Пользователь"

    // If no DB emoji, try to find in name, otherwise use default
    if (!displayEmoji) {
        if (displayName) {
            const match = displayName.match(emojiRegex)
            if (match) {
                displayEmoji = match[0]
                displayName = displayName.replace(emojiRegex, '').trim()
            } else {
                displayEmoji = DEFAULT_EMOJI
            }
        } else {
            displayEmoji = DEFAULT_EMOJI
        }
    }

    const initials = displayName
        ? displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
        : user.email?.slice(0, 2).toUpperCase() || "U"

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 w-full px-3 py-3 hover:bg-[#141413]/95 transition-all duration-200 text-left group rounded-md">
                    {/* Avatar */}
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-500 text-white text-sm font-medium shrink-0">
                        {displayEmoji ? <span className="text-lg leading-none">{displayEmoji}</span> : initials}
                    </div>

                    {isExpanded && (
                        <>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground group-hover:text-white truncate">
                                    {displayName}
                                </p>
                                <p className="text-xs text-zinc-500 group-hover:text-zinc-300 truncate font-mono flex items-center gap-1.5 mt-0.5">
                                    <Coins className="w-3 h-3 text-amber-500" />
                                    <span>{user.credits !== undefined ? user.credits : 0} CR</span>
                                </p>
                            </div>
                            <ChevronUp className="h-4 w-4 text-zinc-400 group-hover:text-white shrink-0" />
                        </>
                    )}
                </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
                side="top"
                align="start"
                className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[200px] mb-2"
                sideOffset={8}
            >
                {/* User Email */}
                <div className="px-3 py-2">
                    <p className="text-sm text-muted-foreground truncate">
                        {user.email}
                    </p>
                </div>

                <DropdownMenuSeparator />

                {/* Settings */}
                <DropdownMenuItem asChild>
                    <Link href="/dashboard/settings" className="flex items-center gap-3 cursor-pointer">
                        <Settings className="h-4 w-4" />
                        <span>Настройки</span>
                    </Link>
                </DropdownMenuItem>

                {/* Billing */}
                <DropdownMenuItem asChild>
                    <Link href="/dashboard/billing" className="flex items-center gap-3 cursor-pointer">
                        <CreditCard className="h-4 w-4" />
                        <span>Биллинг</span>
                    </Link>
                </DropdownMenuItem>

                {/* Referrals */}
                <DropdownMenuItem asChild>
                    <Link href="/referrals" className="flex items-center gap-3 cursor-pointer">
                        <Gift className="h-4 w-4" />
                        <span>Партнёрка</span>
                    </Link>
                </DropdownMenuItem>

                {/* Theme Submenu */}
                <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="flex items-center gap-3">
                        {theme === "dark" ? (
                            <Moon className="h-4 w-4" />
                        ) : theme === "light" ? (
                            <Sun className="h-4 w-4" />
                        ) : (
                            <Monitor className="h-4 w-4" />
                        )}
                        <span>Тема</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                        <DropdownMenuSubContent>
                            <DropdownMenuItem onClick={() => setTheme("light")} className="flex items-center gap-2">
                                <Sun className="h-4 w-4" />
                                <span>Светлая</span>
                                {theme === "light" && <span className="ml-auto">✓</span>}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setTheme("dark")} className="flex items-center gap-2">
                                <Moon className="h-4 w-4" />
                                <span>Тёмная</span>
                                {theme === "dark" && <span className="ml-auto">✓</span>}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setTheme("system")} className="flex items-center gap-2">
                                <Monitor className="h-4 w-4" />
                                <span>Системная</span>
                                {theme === "system" && <span className="ml-auto">✓</span>}
                            </DropdownMenuItem>
                        </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                </DropdownMenuSub>

                {/* Help */}
                <DropdownMenuItem className="flex items-center gap-3 cursor-pointer">
                    <HelpCircle className="h-4 w-4" />
                    <span>Помощь</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {/* Logout */}
                <DropdownMenuItem
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="flex items-center gap-3 cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/20"
                >
                    <LogOut className="h-4 w-4" />
                    <span>Выйти</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
