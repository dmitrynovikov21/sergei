"use client"

import { Input } from "@/components/ui/input"
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
                    Настройки описаний
                </Label>

                <div className="space-y-6">
                    {/* 1. Emoji */}
                    <div className="flex items-center justify-between">
                        <Label htmlFor="edit-emoji" className="text-base font-medium">Эмоджи</Label>
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
                        <div className="pl-0 animate-in fade-in slide-in-from-top-2 duration-200">
                            <Label htmlFor="subscribe-link" className="text-sm text-muted-foreground mb-2 block">
                                Ссылка для подписки
                            </Label>
                            <Input
                                id="subscribe-link"
                                value={subscribeLink}
                                onChange={(e) => setSubscribeLink(e.target.value)}
                                placeholder="https://instagram.com/..."
                                className="bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 focus-visible:ring-zinc-400"
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

                    {/* 4. Code Word */}
                    <div className="flex items-center justify-between">
                        <Label htmlFor="edit-codeword" className="text-base font-medium">Кодовое слово</Label>
                        <Switch
                            id="edit-codeword"
                            className="data-[state=checked]:bg-green-500 will-change-transform"
                            checked={useCodeWord}
                            onCheckedChange={(checked) => {
                                setUseCodeWord(checked)
                                if (checked && !codeWord) setCodeWord("СТАРТ")
                                if (!checked) setCodeWord("")
                            }}
                        />
                    </div>

                    {useCodeWord && (
                        <div className="pl-0 animate-in fade-in slide-in-from-top-2 duration-200">
                            <Label htmlFor="code-word-input" className="text-sm text-muted-foreground mb-2 block">
                                Слово
                            </Label>
                            <Input
                                id="code-word-input"
                                value={codeWord}
                                onChange={(e) => setCodeWord(e.target.value)}
                                placeholder="СТАРТ"
                                className="bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 focus-visible:ring-zinc-400"
                            />
                        </div>
                    )}

                    {/* 5. Audience Question */}
                    <div className="flex items-center justify-between">
                        <Label htmlFor="edit-question" className="text-base font-medium">Вопрос аудитории</Label>
                        <Switch
                            id="edit-question"
                            className="data-[state=checked]:bg-green-500 will-change-transform"
                            checked={useAudienceQuestion}
                            onCheckedChange={setUseAudienceQuestion}
                        />
                    </div>

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
