"use client"

import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface AgentSettings {
    useEmoji: boolean
    useSubscribe: boolean
    useLinkInBio: boolean
    codeWord: string
    audienceQuestion: string
    subscribeLink: string
}

interface AgentGenerationSettingsProps {
    settings: AgentSettings
    onSettingChange: (updates: Partial<AgentSettings>) => void
    onSave: (updates: Partial<AgentSettings>) => void
}

export function AgentGenerationSettings({
    settings,
    onSettingChange,
    onSave
}: AgentGenerationSettingsProps) {
    const {
        useEmoji,
        useSubscribe,
        useLinkInBio,
        codeWord,
        audienceQuestion,
        subscribeLink
    } = settings

    return (
        <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">Дополнительно:</h3>

            <div className="space-y-4">
                {/* Emoji Toggle */}
                <div className="flex items-center justify-between">
                    <Label htmlFor="emoji" className="text-sm text-muted-foreground font-medium">Эмодзи 😎</Label>
                    <Switch
                        id="emoji"
                        checked={useEmoji}
                        onCheckedChange={(checked) => {
                            onSettingChange({ useEmoji: checked })
                            onSave({ useEmoji: checked })
                        }}
                    />
                </div>

                {/* Subscribe Toggle */}
                <div className="flex items-center justify-between">
                    <Label htmlFor="subscribe" className="text-sm text-muted-foreground font-medium">Призыв подписаться</Label>
                    <Switch
                        id="subscribe"
                        checked={useSubscribe}
                        onCheckedChange={(checked) => {
                            onSettingChange({ useSubscribe: checked })
                            onSave({ useSubscribe: checked })
                        }}
                    />
                </div>

                {/* Subscribe Link Input — directly under subscribe toggle */}
                {useSubscribe && (
                    <div className="pt-1 pb-2 space-y-1">
                        <Label htmlFor="subscribe-instruction" className="text-[10px] text-zinc-400">
                            Инструкция для призыва (вшивается в промпт):
                        </Label>
                        <Textarea
                            id="subscribe-instruction"
                            placeholder="В конце текста должен быть призыв подписаться..."
                            value={subscribeLink}
                            onChange={(e) => onSettingChange({ subscribeLink: e.target.value })}
                            onBlur={() => onSave({ subscribeLink })}
                            className="text-sm bg-zinc-800 border-zinc-700 text-foreground min-h-[70px]"
                        />
                    </div>
                )}

                {/* Link in Bio Toggle */}
                <div className="flex items-center justify-between">
                    <Label htmlFor="link" className="text-sm text-muted-foreground font-medium">Призыв на ТГ в шапке профиля</Label>
                    <Switch
                        id="link"
                        checked={useLinkInBio}
                        onCheckedChange={(checked) => {
                            onSettingChange({ useLinkInBio: checked })
                            onSave({ useLinkInBio: checked })
                        }}
                    />
                </div>

                {/* Audience Question Toggle */}
                <div className="flex items-center justify-between">
                    <Label htmlFor="question-toggle" className="text-sm text-muted-foreground font-medium">Вопрос к аудитории</Label>
                    <Switch
                        id="question-toggle"
                        checked={!!audienceQuestion}
                        onCheckedChange={(checked) => {
                            const val = checked ? "В самом конце текста заканчивай пост виральным вопросом к зрителям по теме поста. Используй перед вопросом эмодзи ❓" : ""
                            onSettingChange({ audienceQuestion: val })
                            onSave({ audienceQuestion: val })
                        }}
                    />
                </div>

                {!!audienceQuestion && (
                    <div className="pt-1 pb-2 space-y-1">
                        <Label htmlFor="audience-instruction" className="text-[10px] text-zinc-400">
                            Инструкция для вопроса (вшивается в промпт):
                        </Label>
                        <Textarea
                            id="audience-instruction"
                            placeholder="В самом конце текста заканчивай пост виральным вопросом..."
                            value={audienceQuestion}
                            onChange={(e) => onSettingChange({ audienceQuestion: e.target.value })}
                            onBlur={() => onSave({ audienceQuestion })}
                            className="text-sm bg-zinc-800 border-zinc-700 text-foreground min-h-[70px]"
                        />
                    </div>
                )}
            </div>
        </div>
    )
}
