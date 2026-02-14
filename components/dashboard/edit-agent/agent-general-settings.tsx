"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

const SETTINGS_HEADER = "--- НАСТРОЙКИ ОПИСАНИЯ (АВТОМАТИЧЕСКИЕ) ---"
const SETTINGS_FOOTER = "--- КОНЕЦ НАСТРОЕК ---"

interface AgentGeneralSettingsProps {
    name: string
    setName: (name: string) => void
    systemPrompt: string
    setSystemPrompt: (prompt: string) => void
}

/** Strip auto-generated settings block from visible prompt */
function getVisiblePrompt(full: string): string {
    const startIdx = full.indexOf(SETTINGS_HEADER)
    const endIdx = full.indexOf(SETTINGS_FOOTER)
    if (startIdx === -1 || endIdx === -1) return full
    const before = full.substring(0, startIdx) // Don't trim to preserve cursor/newlines
    const after = full.substring(endIdx + SETTINGS_FOOTER.length).trim()
    return [before, after].filter(Boolean).join("\n\n")
}

/** Rebuild full prompt: user-visible part + preserved hidden settings block */
function rebuildFullPrompt(visibleText: string, originalFull: string): string {
    const startIdx = originalFull.indexOf(SETTINGS_HEADER)
    const endIdx = originalFull.indexOf(SETTINGS_FOOTER)
    if (startIdx === -1 || endIdx === -1) return visibleText
    const settingsBlock = originalFull.substring(startIdx, endIdx + SETTINGS_FOOTER.length)
    return `${visibleText}${settingsBlock}` // Use exact text, no added newlines to avoid duplication
}

export function AgentGeneralSettings({
    name,
    setName,
    systemPrompt,
    setSystemPrompt
}: AgentGeneralSettingsProps) {
    // Generate initials from name
    const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'AI'

    const visiblePrompt = getVisiblePrompt(systemPrompt)

    const handlePromptChange = (newVisible: string) => {
        setSystemPrompt(rebuildFullPrompt(newVisible, systemPrompt))
    }

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
                    value={visiblePrompt}
                    onChange={(e) => handlePromptChange(e.target.value)}
                    placeholder="Опишите поведение и роль AI агента..."
                    className="min-h-[300px] font-mono text-sm bg-transparent border-zinc-200 dark:border-zinc-700 rounded-xl resize-y"
                />
            </div>
        </div>
    )
}
