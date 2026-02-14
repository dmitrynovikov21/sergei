"use client"

import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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
        </div>
    )
}
