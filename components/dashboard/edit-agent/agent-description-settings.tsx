"use client"

import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Smile, Megaphone, Link2, MessageCircleQuestion } from "lucide-react"

interface AgentDescriptionSettingsProps {
    useEmoji: boolean
    setUseEmoji: (v: boolean) => void
    useSubscribe: boolean
    setUseSubscribe: (v: boolean) => void
    useLinkInBio: boolean
    setUseLinkInBio: (v: boolean) => void
    subscribeLink: string
    setSubscribeLink: (v: string) => void
    codeWord: string
    setCodeWord: (v: string) => void
    useCodeWord: boolean
    setUseCodeWord: (v: boolean) => void
    audienceQuestion: string
    setAudienceQuestion: (v: string) => void
    useAudienceQuestion: boolean
    setUseAudienceQuestion: (v: boolean) => void
    selectedDatasetId: string | null
    setSelectedDatasetId: (v: string | null) => void
    datasets: { id: string, name: string }[]
}

/** Inline instruction card — appears under a toggle when it's active */
function InstructionCard({ icon: Icon, text }: { icon: React.ElementType, text: string }) {
    return (
        <div className="flex items-start gap-3 bg-zinc-100 dark:bg-zinc-800/60 rounded-xl px-4 py-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <Icon className="h-5 w-5 text-zinc-400 dark:text-zinc-500 mt-0.5 shrink-0" />
            <span className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{text}</span>
        </div>
    )
}

export function AgentDescriptionSettings({
    useEmoji, setUseEmoji,
    useSubscribe, setUseSubscribe,
    useLinkInBio, setUseLinkInBio,
    subscribeLink, setSubscribeLink,
    codeWord, setCodeWord,
    useCodeWord, setUseCodeWord,
    audienceQuestion, setAudienceQuestion,
    useAudienceQuestion, setUseAudienceQuestion,
    selectedDatasetId, setSelectedDatasetId,
    datasets
}: AgentDescriptionSettingsProps) {
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
                                className="data-[state=checked]:bg-green-500 will-change-transform"
                                checked={useEmoji}
                                onCheckedChange={setUseEmoji}
                            />
                        </div>
                        {useEmoji && (
                            <InstructionCard
                                icon={Smile}
                                text="Добавляй в текст эмодзи, где это уместно, но без фанатизма. Например вместо пунктов в тексте, можно сделать соответствующие эмодзи, но если подразумевается нумерованный список, то сделай цифры, а не эмодзи."
                            />
                        )}
                    </div>

                    {/* 2. Subscribe */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="edit-subscribe" className="text-base font-medium">Призыв подписаться</Label>
                            <Switch
                                id="edit-subscribe"
                                className="data-[state=checked]:bg-green-500 will-change-transform"
                                checked={useSubscribe}
                                onCheckedChange={setUseSubscribe}
                            />
                        </div>
                        {useSubscribe && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                <InstructionCard
                                    icon={Megaphone}
                                    text={subscribeLink || "В конце текста должен быть призыв подписаться."}
                                />
                                <Textarea
                                    id="subscribe-link"
                                    value={subscribeLink}
                                    onChange={(e) => setSubscribeLink(e.target.value)}
                                    placeholder="Напишите свою инструкцию для призыва..."
                                    className="bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 focus-visible:ring-zinc-400 min-h-[80px] text-sm"
                                />
                            </div>
                        )}
                    </div>

                    {/* 3. Telegram Link */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="edit-tg" className="text-base font-medium">Призыв на ТГ в шапке профиля</Label>
                            <Switch
                                id="edit-tg"
                                className="data-[state=checked]:bg-green-500 will-change-transform"
                                checked={useLinkInBio}
                                onCheckedChange={setUseLinkInBio}
                            />
                        </div>
                        {useLinkInBio && (
                            <InstructionCard
                                icon={Link2}
                                text="Упомяни что полезная информация есть в ТГ по ссылке в шапке профиля."
                            />
                        )}
                    </div>

                    {/* 4. Audience Question */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="edit-question" className="text-base font-medium">Вопрос к аудитории</Label>
                            <Switch
                                id="edit-question"
                                className="data-[state=checked]:bg-green-500 will-change-transform"
                                checked={useAudienceQuestion}
                                onCheckedChange={setUseAudienceQuestion}
                            />
                        </div>
                        {useAudienceQuestion && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                <InstructionCard
                                    icon={MessageCircleQuestion}
                                    text={audienceQuestion || "В самом конце текста заканчивай пост виральным вопросом к аудитории."}
                                />
                                <Textarea
                                    id="audience-question"
                                    value={audienceQuestion}
                                    onChange={(e) => setAudienceQuestion(e.target.value)}
                                    placeholder="Напишите свою инструкцию для вопроса..."
                                    className="bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 focus-visible:ring-zinc-400 min-h-[80px] text-sm"
                                />
                            </div>
                        )}
                    </div>

                    {/* 5. Dataset Selection */}
                    <div className="flex items-center justify-between pt-2">
                        <Label htmlFor="edit-dataset" className="text-base font-medium">Датасет (контекст)</Label>
                        <Select
                            value={selectedDatasetId || "none"}
                            onValueChange={(value) => setSelectedDatasetId(value === "none" ? null : value)}
                        >
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Без контекста" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Без контекста</SelectItem>
                                {datasets.map(ds => (
                                    <SelectItem key={ds.id} value={ds.id}>{ds.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>
        </div>
    )
}

