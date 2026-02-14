"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { UserNameForm } from "@/components/forms/user-name-form"
import { ChangePasswordForm } from "@/components/forms/change-password-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { User, Shield } from "lucide-react"

interface SettingsTabsProps {
    user: {
        id: string
        name: string
        role: string
    }
    hasPassword: boolean
    connectedProviders: string[]
}

const tabs = [
    { id: "profile", label: "Профиль", icon: User },
    { id: "security", label: "Безопасность", icon: Shield },
]

export function SettingsTabs({ user, hasPassword, connectedProviders }: SettingsTabsProps) {
    const [activeTab, setActiveTab] = useState("profile")

    return (
        <div className="flex gap-8 pb-10">
            {/* Left Navigation */}
            <nav className="w-48 shrink-0">
                <div className="sticky top-24 space-y-1">
                    {tabs.map((tab) => {
                        const Icon = tab.icon
                        const isActive = activeTab === tab.id
                        const isDanger = tab.id === "danger"

                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-all duration-200 text-left",
                                    isActive
                                        ? isDanger
                                            ? "bg-destructive/10 text-destructive font-medium"
                                            : "bg-[#141413]/95 text-white font-medium"
                                        : isDanger
                                            ? "text-destructive/70 hover:text-destructive hover:bg-destructive/5"
                                            : "text-muted-foreground hover:text-white hover:bg-[#141413]/95"
                                )}
                            >
                                <Icon className="h-4 w-4" />
                                {tab.label}
                            </button>
                        )
                    })}
                </div>
            </nav>

            {/* Right Content */}
            <div className="flex-1 max-w-2xl">
                {activeTab === "profile" && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <span className="text-lg">👤</span>
                                Профиль
                            </CardTitle>
                            <CardDescription>
                                Основная информация о вашем аккаунте
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <UserNameForm user={{ id: user.id, name: user.name }} />
                        </CardContent>
                    </Card>
                )}

                {activeTab === "security" && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <span className="text-lg">🔒</span>
                                Безопасность
                            </CardTitle>
                            <CardDescription>
                                Пароль и способы входа
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Password */}
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium">Пароль</p>
                                    <p className="text-sm text-muted-foreground">
                                        {hasPassword
                                            ? "Установлен — вы можете входить по email"
                                            : "Не установлен — только OAuth"
                                        }
                                    </p>
                                </div>
                                <ChangePasswordForm hasPassword={hasPassword} />
                            </div>

                            {/* Connected Providers */}
                            <div className="pt-4 border-t">
                                <p className="font-medium mb-3">Способы входа</p>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between py-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm">📧</span>
                                            <span className="text-sm">Email + пароль</span>
                                        </div>
                                        <Badge variant={hasPassword ? "default" : "secondary"}>
                                            {hasPassword ? "Активен" : "Не настроен"}
                                        </Badge>
                                    </div>

                                    <div className="flex items-center justify-between py-2">
                                        <div className="flex items-center gap-2">
                                            <svg className="size-4" viewBox="0 0 24 24">
                                                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                            </svg>
                                            <span className="text-sm">Google</span>
                                        </div>
                                        <Badge variant={connectedProviders.includes("google") ? "default" : "secondary"}>
                                            {connectedProviders.includes("google") ? "Подключен" : "Не подключен"}
                                        </Badge>
                                    </div>


                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}


            </div>
        </div>
    )
}
