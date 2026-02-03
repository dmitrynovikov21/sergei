/**
 * Add Source Dialog
 * 
 * Supports bulk URL input and filtering options
 */

"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Icons } from "@/components/shared/icons"
import { addBulkTrackingSources } from "@/actions/datasets"
import { toast } from "sonner"

interface AddSourceDialogProps {
    datasetId: string
}

export function AddSourceDialog({ datasetId }: AddSourceDialogProps) {
    const [open, setOpen] = useState(false)
    const [urls, setUrls] = useState("")
    const [daysLimit, setDaysLimit] = useState("14")
    const [minViews, setMinViews] = useState("0")

    // Content type filters
    const [includeReels, setIncludeReels] = useState(true)
    const [includeCarousels, setIncludeCarousels] = useState(true)
    const [includePosts, setIncludePosts] = useState(false)

    const [isPending, startTransition] = useTransition()
    const router = useRouter()

    const handleAdd = () => {
        const urlList = urls
            .split("\n")
            .map(u => u.trim())
            .filter(u => u.length > 0)

        if (urlList.length === 0) return

        // Build content types string
        const contentTypes: string[] = []
        if (includeReels) contentTypes.push("Video")
        if (includeCarousels) contentTypes.push("Sidecar")
        if (includePosts) contentTypes.push("Image")

        if (contentTypes.length === 0) {
            toast.error("Выберите хотя бы один тип контента")
            return
        }

        startTransition(async () => {
            try {
                const minViewsNum = Number(minViews) || 0
                const daysNum = Number(daysLimit) || 30
                console.log('[AddSource] minViews input:', minViews, '-> number:', minViewsNum)
                console.log('[AddSource] daysLimit input:', daysLimit, '-> number:', daysNum)

                const result = await addBulkTrackingSources(
                    datasetId,
                    urlList,
                    {
                        minViewsFilter: minViewsNum,
                        daysLimit: daysNum,
                        contentTypes: contentTypes.join(",")
                    }
                )

                toast.success(`Добавлено ${result.added} источников`)
                setOpen(false)
                setUrls("")
                router.refresh()
            } catch (error) {
                toast.error(error instanceof Error ? error.message : "Ошибка")
            }
        })
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Icons.plus className="h-4 w-4 mr-2" />
                    Добавить конкурентов
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Добавить конкурентов</DialogTitle>
                    <DialogDescription>
                        Вставьте ссылки на Instagram профили (каждый с новой строки)
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Bulk URLs input */}
                    <div className="space-y-2">
                        <Label htmlFor="urls">Instagram URL (по одному на строку)</Label>
                        <Textarea
                            id="urls"
                            value={urls}
                            onChange={(e) => setUrls(e.target.value)}
                            placeholder={"https://instagram.com/user1\nhttps://instagram.com/user2\nhttps://instagram.com/user3"}
                            rows={5}
                        />
                    </div>

                    {/* Content type filters */}
                    <div className="space-y-2">
                        <Label>Что собирать</Label>
                        <div className="flex flex-wrap gap-4">
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="reels"
                                    checked={includeReels}
                                    onCheckedChange={(v) => setIncludeReels(!!v)}
                                />
                                <label htmlFor="reels" className="text-sm">Reels (видео)</label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="carousels"
                                    checked={includeCarousels}
                                    onCheckedChange={(v) => setIncludeCarousels(!!v)}
                                />
                                <label htmlFor="carousels" className="text-sm">Карусели</label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="posts"
                                    checked={includePosts}
                                    onCheckedChange={(v) => setIncludePosts(!!v)}
                                />
                                <label htmlFor="posts" className="text-sm">Посты (фото)</label>
                            </div>
                        </div>
                    </div>

                    {/* Time period - Toggle buttons */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>За последние</Label>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant={daysLimit === "7" ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setDaysLimit("7")}
                                    className="flex-1"
                                >
                                    7 дней
                                </Button>
                                <Button
                                    type="button"
                                    variant={daysLimit === "14" ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setDaysLimit("14")}
                                    className="flex-1"
                                >
                                    14 дней
                                </Button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="minViews">Мин. просмотров</Label>
                            <Input
                                id="minViews"
                                type="number"
                                value={minViews}
                                onChange={(e) => setMinViews(e.target.value)}
                                placeholder="10000"
                            />
                        </div>
                    </div>

                    <p className="text-xs text-muted-foreground">
                        Посты с меньшим количеством просмотров будут пропущены при AI обработке
                    </p>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>
                        Отмена
                    </Button>
                    <Button onClick={handleAdd} disabled={isPending || !urls.trim()}>
                        {isPending && <Icons.spinner className="h-4 w-4 mr-2 animate-spin" />}
                        Добавить
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
