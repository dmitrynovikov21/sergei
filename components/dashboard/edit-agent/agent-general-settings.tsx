"use client"

import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface AgentGeneralSettingsProps {
    systemPrompt: string
    setSystemPrompt: (prompt: string) => void
}

export function AgentGeneralSettings({
    systemPrompt,
    setSystemPrompt
}: AgentGeneralSettingsProps) {
    return (
        <div className="space-y-6 p-6">
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
