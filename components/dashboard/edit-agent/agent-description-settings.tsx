"use client"

import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Smile, Megaphone, Link2, MessageCircleQuestion } from "lucide-react"

// Marker-based instruction blocks in systemPrompt
const SETTINGS_MARKER = "\n\nНАСТРОЙКИ ОПИСАНИЯ"
const EMOJI_MARKER = "\n\n[EMOJI] "
const SUBSCRIBE_MARKER = "\n\n[SUBSCRIBE] "
const TG_MARKER = "\n\n[TG_LINK] "
const QUESTION_MARKER = "\n\n[QUESTION] "

const EMOJI_TEXT = "Добавляй в текст эмодзи, где это уместно, но без фанатизма. Например вместо пунктов в тексте, можно сделать соответствующие эмодзи, но если подразумевается нумерованный список, то сделай цифры, а не эмодзи."
const SUBSCRIBE_DEFAULT = "В конце текста должен быть призыв подписаться. Важно, чтобы это было нативно — призыв связан с темой текста."
const TG_TEXT = "Упомяни что полезная информация есть в ТГ по ссылке в шапке профиля."
const QUESTION_DEFAULT = "В самом конце текста заканчивай пост виральным вопросом к аудитории."

// --- Exported marker utilities (shared with agent-generation-settings.tsx) ---

export function hasBlock(prompt: string, marker: string): boolean {
    return prompt.includes(marker)
}

export function addBlock(prompt: string, marker: string, text: string): string {
    if (hasBlock(prompt, marker)) return prompt
    if (!prompt.includes(SETTINGS_MARKER)) {
        return prompt + SETTINGS_MARKER + marker + text
    }
    return prompt + marker + text
}

export function removeBlock(prompt: string, marker: string): string {
    const idx = prompt.indexOf(marker)
    if (idx === -1) return prompt

    const allMarkers = [EMOJI_MARKER, SUBSCRIBE_MARKER, TG_MARKER, QUESTION_MARKER, SETTINGS_MARKER]
    let endIdx = prompt.length
    for (const m of allMarkers) {
        const mIdx = prompt.indexOf(m, idx + marker.length)
        if (mIdx !== -1 && mIdx < endIdx) endIdx = mIdx
    }

    let result = prompt.substring(0, idx) + prompt.substring(endIdx)
    const hasAny = allMarkers.some(m => m !== SETTINGS_MARKER && result.includes(m))
    if (!hasAny && result.includes(SETTINGS_MARKER)) {
        result = result.replace(SETTINGS_MARKER, "")
    }
    return result
}

export function getBlockText(prompt: string, marker: string, defaultText: string): string {
    const idx = prompt.indexOf(marker)
    if (idx === -1) return defaultText
    const startText = idx + marker.length
    const allMarkers = [EMOJI_MARKER, SUBSCRIBE_MARKER, TG_MARKER, QUESTION_MARKER, SETTINGS_MARKER]
    let endIdx = prompt.length
    for (const m of allMarkers) {
        const mIdx = prompt.indexOf(m, startText)
        if (mIdx !== -1 && mIdx < endIdx) endIdx = mIdx
    }
    return prompt.substring(startText, endIdx).trim()
}

export function updateBlockText(prompt: string, marker: string, newText: string): string {
    const idx = prompt.indexOf(marker)
    if (idx === -1) return prompt
    const startText = idx + marker.length
    const allMarkers = [EMOJI_MARKER, SUBSCRIBE_MARKER, TG_MARKER, QUESTION_MARKER, SETTINGS_MARKER]
    let endIdx = prompt.length
    for (const m of allMarkers) {
        const mIdx = prompt.indexOf(m, startText)
        if (mIdx !== -1 && mIdx < endIdx) endIdx = mIdx
    }
    return prompt.substring(0, startText) + newText + prompt.substring(endIdx)
}

// Export markers for reuse
export { EMOJI_MARKER, SUBSCRIBE_MARKER, TG_MARKER, QUESTION_MARKER, SETTINGS_MARKER }
export { EMOJI_TEXT, SUBSCRIBE_DEFAULT, TG_TEXT, QUESTION_DEFAULT }

// --- Component ---

interface AgentDescriptionSettingsProps {
    systemPrompt: string
    setSystemPrompt: (prompt: string) => void
    /** Called after each toggle change with the new prompt — auto-saves to DB */
    onAutoSave?: (newPrompt: string) => void
}

function InstructionCard({ icon: Icon, text }: { icon: React.ElementType, text: string }) {
    return (
        <div className="flex items-start gap-3 bg-zinc-100 rounded-xl px-4 py-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <Icon className="h-5 w-5 text-zinc-400 mt-0.5 shrink-0" />
            <span className="text-sm text-zinc-600 leading-relaxed">{text}</span>
        </div>
    )
}

export function AgentDescriptionSettings({ systemPrompt, setSystemPrompt, onAutoSave }: AgentDescriptionSettingsProps) {
    const emojiOn = hasBlock(systemPrompt, EMOJI_MARKER)
    const subscribeOn = hasBlock(systemPrompt, SUBSCRIBE_MARKER)
    const tgOn = hasBlock(systemPrompt, TG_MARKER)
    const questionOn = hasBlock(systemPrompt, QUESTION_MARKER)

    const subscribeText = getBlockText(systemPrompt, SUBSCRIBE_MARKER, SUBSCRIBE_DEFAULT)
    const questionText = getBlockText(systemPrompt, QUESTION_MARKER, QUESTION_DEFAULT)

    /** Update prompt + auto-save */
    const update = (newPrompt: string) => {
        setSystemPrompt(newPrompt)
        onAutoSave?.(newPrompt)
    }

    return (
        <div className="p-6">
            <div className="space-y-5 p-5 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl">
                <Label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                    Дополнительно:
                </Label>

                <div className="space-y-4">
                    {/* 1. Emoji */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="edit-emoji" className="text-base font-medium">Эмодзи 😎</Label>
                            <Switch
                                id="edit-emoji"
                                className="data-[state=checked]:bg-green-500 will-change-transform focus-visible:ring-zinc-300 focus-visible:ring-offset-0"
                                checked={emojiOn}
                                onCheckedChange={(on) => update(on ? addBlock(systemPrompt, EMOJI_MARKER, EMOJI_TEXT) : removeBlock(systemPrompt, EMOJI_MARKER))}
                            />
                        </div>
                        {emojiOn && <InstructionCard icon={Smile} text={EMOJI_TEXT} />}
                    </div>

                    {/* 2. Subscribe */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="edit-subscribe" className="text-base font-medium">Призыв подписаться</Label>
                            <Switch
                                id="edit-subscribe"
                                className="data-[state=checked]:bg-green-500 will-change-transform focus-visible:ring-zinc-300 focus-visible:ring-offset-0"
                                checked={subscribeOn}
                                onCheckedChange={(on) => update(on ? addBlock(systemPrompt, SUBSCRIBE_MARKER, SUBSCRIBE_DEFAULT) : removeBlock(systemPrompt, SUBSCRIBE_MARKER))}
                            />
                        </div>
                        {subscribeOn && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                <InstructionCard icon={Megaphone} text={subscribeText} />
                                <Textarea
                                    value={subscribeText}
                                    onChange={(e) => setSystemPrompt(updateBlockText(systemPrompt, SUBSCRIBE_MARKER, e.target.value))}
                                    onBlur={() => onAutoSave?.(systemPrompt)}
                                    placeholder="Напишите свою инструкцию для призыва..."
                                    className="bg-white border-zinc-200 focus-visible:ring-zinc-300 min-h-[80px] text-sm"
                                />
                            </div>
                        )}
                    </div>

                    {/* 3. TG Link */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="edit-tg" className="text-base font-medium">Призыв на ТГ в шапке профиля</Label>
                            <Switch
                                id="edit-tg"
                                className="data-[state=checked]:bg-green-500 will-change-transform focus-visible:ring-zinc-300 focus-visible:ring-offset-0"
                                checked={tgOn}
                                onCheckedChange={(on) => update(on ? addBlock(systemPrompt, TG_MARKER, TG_TEXT) : removeBlock(systemPrompt, TG_MARKER))}
                            />
                        </div>
                        {tgOn && <InstructionCard icon={Link2} text={TG_TEXT} />}
                    </div>

                    {/* 4. Audience Question */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="edit-question" className="text-base font-medium">Вопрос к аудитории</Label>
                            <Switch
                                id="edit-question"
                                className="data-[state=checked]:bg-green-500 will-change-transform focus-visible:ring-zinc-300 focus-visible:ring-offset-0"
                                checked={questionOn}
                                onCheckedChange={(on) => update(on ? addBlock(systemPrompt, QUESTION_MARKER, QUESTION_DEFAULT) : removeBlock(systemPrompt, QUESTION_MARKER))}
                            />
                        </div>
                        {questionOn && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                <InstructionCard icon={MessageCircleQuestion} text={questionText} />
                                <Textarea
                                    value={questionText}
                                    onChange={(e) => setSystemPrompt(updateBlockText(systemPrompt, QUESTION_MARKER, e.target.value))}
                                    onBlur={() => onAutoSave?.(systemPrompt)}
                                    placeholder="Напишите свою инструкцию для вопроса..."
                                    className="bg-white border-zinc-200 focus-visible:ring-zinc-300 min-h-[80px] text-sm"
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
