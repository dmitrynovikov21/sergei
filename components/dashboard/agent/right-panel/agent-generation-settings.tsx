"use client"

import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

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
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">Настройки генерации</h3>

            <div className="space-y-4">
                {/* Emoji Toggle */}
                <div className="flex items-center justify-between">
                    <Label htmlFor="emoji" className="text-sm text-muted-foreground font-medium">Эмодзи</Label>
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

                {/* Unified Link Input */}
                {(useSubscribe || useLinkInBio) && (
                    <div className="pt-1 pb-2">
                        <Input
                            placeholder="@ваш_ник или ссылка (https://...)"
                            value={subscribeLink}
                            onChange={(e) => onSettingChange({ subscribeLink: e.target.value })}
                            onBlur={() => onSave({ subscribeLink })}
                            className="h-9 text-sm bg-zinc-50 dark:bg-zinc-800"
                        />
                        <p className="text-[10px] text-zinc-400 mt-1">
                            Ссылка будет добавлена в призыв.
                        </p>
                    </div>
                )}

                {/* Code Word Toggle & Input */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="codeword-toggle" className="text-sm text-muted-foreground font-medium">Кодовое слово</Label>
                        <Switch
                            id="codeword-toggle"
                            checked={!!codeWord}
                            onCheckedChange={(checked) => {
                                const val = checked ? "Гайд" : ""
                                onSettingChange({ codeWord: val })
                                onSave({ codeWord: val })
                            }}
                        />
                    </div>
                    {!!codeWord && (
                        <Input
                            id="codeword"
                            placeholder="Например: ГАЙД"
                            value={codeWord}
                            onChange={(e) => onSettingChange({ codeWord: e.target.value })}
                            onBlur={() => onSave({ codeWord })}
                            className="h-8 text-sm"
                        />
                    )}
                </div>

                {/* Audience Question Toggle (No Input) */}
                <div className="flex items-center justify-between">
                    <Label htmlFor="question-toggle" className="text-sm text-muted-foreground font-medium">Вопрос аудитории</Label>
                    <Switch
                        id="question-toggle"
                        checked={!!audienceQuestion}
                        onCheckedChange={(checked) => {
                            const val = checked ? "Какая у вас ниша?" : ""
                            onSettingChange({ audienceQuestion: val })
                            onSave({ audienceQuestion: val })
                        }}
                    />
                </div>
            </div>
        </div>
    )
}
