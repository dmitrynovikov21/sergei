"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface AgentGeneralSettingsProps {
    name: string
    setName: (name: string) => void
    systemPrompt: string
    setSystemPrompt: (prompt: string) => void
}

export function AgentGeneralSettings({
    name,
    setName,
    systemPrompt,
    setSystemPrompt
}: AgentGeneralSettingsProps) {
    // Generate initials from name
    const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'AI'

    return (
        <div className="space-y-6 p-6">
            <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-xl bg-muted flex items-center justify-center text-xl font-semibold text-muted-foreground">
                    {initials}
                </div>
                <div className="flex-1">
                    <Label htmlFor="agent-name" className="text-sm font-medium mb-1 block">
                        Имя агента
                    </Label>
                    <Input
                        id="agent-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="text-lg font-semibold h-12"
                        placeholder="Название агента"
                    />
                </div>
            </div>

            <div className="space-y-3">
                <Label htmlFor="systemPrompt" className="text-sm font-medium">
                    Системный промпт (инструкции)
                </Label>
                <Textarea
                    id="systemPrompt"
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    placeholder="Опишите поведение и роль AI агента..."
                    className="min-h-[300px] font-mono text-sm bg-transparent border-zinc-200 dark:border-zinc-700 rounded-xl resize-y"
                />
            </div>
        </div>
    )
}
