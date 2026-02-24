"use client"

import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    hasBlock, addBlock, removeBlock, getBlockText, updateBlockText,
    EMOJI_MARKER, SUBSCRIBE_MARKER, TG_MARKER, QUESTION_MARKER,
    EMOJI_TEXT, SUBSCRIBE_DEFAULT, TG_TEXT, QUESTION_DEFAULT
} from "@/components/dashboard/edit-agent/agent-description-settings"

interface AgentGenerationSettingsProps {
    systemPrompt: string
    onPromptChange: (newPrompt: string) => void
}

export function AgentGenerationSettings({ systemPrompt, onPromptChange }: AgentGenerationSettingsProps) {
    const emojiOn = hasBlock(systemPrompt, EMOJI_MARKER)
    const subscribeOn = hasBlock(systemPrompt, SUBSCRIBE_MARKER)
    const tgOn = hasBlock(systemPrompt, TG_MARKER)
    const questionOn = hasBlock(systemPrompt, QUESTION_MARKER)

    const subscribeText = getBlockText(systemPrompt, SUBSCRIBE_MARKER, SUBSCRIBE_DEFAULT)
    const questionText = getBlockText(systemPrompt, QUESTION_MARKER, QUESTION_DEFAULT)

    return (
        <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">Дополнительно:</h3>

            <div className="space-y-4">
                {/* Emoji Toggle */}
                <div className="flex items-center justify-between">
                    <Label htmlFor="emoji" className="text-sm text-muted-foreground font-medium">Эмодзи 😎</Label>
                    <Switch
                        id="emoji"
                        checked={emojiOn}
                        onCheckedChange={(on) => onPromptChange(on ? addBlock(systemPrompt, EMOJI_MARKER, EMOJI_TEXT) : removeBlock(systemPrompt, EMOJI_MARKER))}
                    />
                </div>

                {/* Subscribe Toggle */}
                <div className="flex items-center justify-between">
                    <Label htmlFor="subscribe" className="text-sm text-muted-foreground font-medium">Призыв подписаться</Label>
                    <Switch
                        id="subscribe"
                        checked={subscribeOn}
                        onCheckedChange={(on) => onPromptChange(on ? addBlock(systemPrompt, SUBSCRIBE_MARKER, SUBSCRIBE_DEFAULT) : removeBlock(systemPrompt, SUBSCRIBE_MARKER))}
                    />
                </div>

                {subscribeOn && (
                    <div className="pt-1 pb-2 space-y-1">
                        <Label htmlFor="subscribe-instruction" className="text-[10px] text-zinc-400">
                            Инструкция для призыва:
                        </Label>
                        <Textarea
                            id="subscribe-instruction"
                            placeholder="В конце текста должен быть призыв подписаться..."
                            value={subscribeText}
                            onChange={(e) => onPromptChange(updateBlockText(systemPrompt, SUBSCRIBE_MARKER, e.target.value))}
                            className="text-sm bg-zinc-800 border-zinc-700 text-foreground min-h-[70px]"
                        />
                    </div>
                )}

                {/* Link in Bio Toggle */}
                <div className="flex items-center justify-between">
                    <Label htmlFor="link" className="text-sm text-muted-foreground font-medium">Призыв на ТГ в шапке профиля</Label>
                    <Switch
                        id="link"
                        checked={tgOn}
                        onCheckedChange={(on) => onPromptChange(on ? addBlock(systemPrompt, TG_MARKER, TG_TEXT) : removeBlock(systemPrompt, TG_MARKER))}
                    />
                </div>

                {/* Audience Question Toggle */}
                <div className="flex items-center justify-between">
                    <Label htmlFor="question-toggle" className="text-sm text-muted-foreground font-medium">Вопрос к аудитории</Label>
                    <Switch
                        id="question-toggle"
                        checked={questionOn}
                        onCheckedChange={(on) => onPromptChange(on ? addBlock(systemPrompt, QUESTION_MARKER, QUESTION_DEFAULT) : removeBlock(systemPrompt, QUESTION_MARKER))}
                    />
                </div>

                {questionOn && (
                    <div className="pt-1 pb-2 space-y-1">
                        <Label htmlFor="audience-instruction" className="text-[10px] text-zinc-400">
                            Инструкция для вопроса:
                        </Label>
                        <Textarea
                            id="audience-instruction"
                            placeholder="В самом конце текста заканчивай пост виральным вопросом..."
                            value={questionText}
                            onChange={(e) => onPromptChange(updateBlockText(systemPrompt, QUESTION_MARKER, e.target.value))}
                            className="text-sm bg-zinc-800 border-zinc-700 text-foreground min-h-[70px]"
                        />
                    </div>
                )}
            </div>
        </div>
    )
}
