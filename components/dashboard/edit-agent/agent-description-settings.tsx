"use client"

import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertCircle, Info } from "lucide-react"

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
    // Вычисляем активные инструкции на лету для предпросмотра
    const calculateActiveInstructions = () => {
        const instructions: string[] = []

        if (useEmoji) {
            instructions.push("Добавляй в текст эмодзи, где это уместно, но без фанатизма. Например вместо пунктов в тексте, можно сделать соответствующие эмодзи, но если подразумевается нумерованный список, то сделай цифры, а не эмодзи.")
        }

        if (useSubscribe) {
            instructions.push(subscribeLink || "В конце текста должен быть призыв подписаться.")
        } else if (useLinkInBio) {
            instructions.push("Упомяни что полезная информация есть в ТГ по ссылке в шапке профиля.")
        }

        if (useCodeWord && codeWord) {
            instructions.push(`Добавь призыв написать кодовое слово "${codeWord}" в директ/комментарии`)
        }

        if (useAudienceQuestion && audienceQuestion) {
            instructions.push(audienceQuestion)
        }

        return instructions
    }

    const activeInstructions = calculateActiveInstructions()

    return (
        <div className="p-6">
            <div className="space-y-5 p-5 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl">
                <Label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                    Дополнительно:
                </Label>

                <div className="space-y-6">
                    {/* 1. Emoji */}
                    <div className="flex items-center justify-between">
                        <Label htmlFor="edit-emoji" className="text-base font-medium">Эмодзи 😎</Label>
                        <Switch
                            id="edit-emoji"
                            className="data-[state=checked]:bg-green-500 will-change-transform"
                            checked={useEmoji}
                            onCheckedChange={setUseEmoji}
                        />
                    </div>

                    {/* 2. Subscribe */}
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
                        <div className="pl-0 animate-in fade-in slide-in-from-top-2 duration-200 space-y-2">
                            <Label htmlFor="subscribe-link" className="text-xs text-muted-foreground">
                                Инструкция для призыва (вшивается в промпт):
                            </Label>
                            <Textarea
                                id="subscribe-link"
                                value={subscribeLink}
                                onChange={(e) => setSubscribeLink(e.target.value)}
                                placeholder="В конце текста должен быть призыв подписаться..."
                                className="bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 focus-visible:ring-zinc-400 min-h-[80px]"
                            />
                        </div>
                    )}

                    {/* 3. Telegram Link */}
                    <div className="flex items-center justify-between">
                        <Label htmlFor="edit-tg" className="text-base font-medium">Призыв на ТГ в шапке профиля</Label>
                        <Switch
                            id="edit-tg"
                            className="data-[state=checked]:bg-green-500 will-change-transform"
                            checked={useLinkInBio}
                            onCheckedChange={setUseLinkInBio}
                        />
                    </div>

                    {/* 4. Audience Question */}
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
                        <div className="pl-0 animate-in fade-in slide-in-from-top-2 duration-200 space-y-2">
                            <Label htmlFor="audience-question" className="text-xs text-muted-foreground">
                                Инструкция для вопроса (вшивается в промпт):
                            </Label>
                            <Textarea
                                id="audience-question"
                                value={audienceQuestion}
                                onChange={(e) => setAudienceQuestion(e.target.value)}
                                placeholder="В самом конце текста заканчивай пост виральным вопросом..."
                                className="bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 focus-visible:ring-zinc-400 min-h-[80px]"
                            />
                        </div>
                    )}

                    {/* 6. Dataset Selection */}
                    <div className="flex items-center justify-between">
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

            {/* Блок предпросмотра инструкций */}
            {activeInstructions.length > 0 && (
                <div className="mt-6 flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                        <Info className="h-4 w-4" />
                        <span className="text-sm font-medium">Предпросмотр активных инструкций</span>
                    </div>
                    <div className="bg-zinc-100/50 dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 text-sm font-mono text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap leading-relaxed shadow-inner">
                        <span className="text-zinc-400 dark:text-zinc-500 block mb-2 opacity-70">{"=== ВАЖНЫЕ ИНСТРУКЦИИ ДЛЯ ЭТОГО ОТВЕТА ==="}</span>
                        {activeInstructions.join("\n\n")}
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-500 flex items-center gap-1.5 ml-1">
                        <AlertCircle className="h-3 w-3" />
                        Этот текст будет автоматически добавлен к запросу нейросети.
                    </p>
                </div>
            )}
        </div>
    )
}
