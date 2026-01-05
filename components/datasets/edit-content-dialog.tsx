/**
 * Edit Content Dialog
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Icons } from "@/components/shared/icons"
import { updateContentItem } from "@/actions/datasets"
import { toast } from "sonner"

interface ContentItem {
    id: string
    headline: string | null
    transcript: string | null
    isApproved: boolean
}

interface EditContentDialogProps {
    item: ContentItem
}

export function EditContentDialog({ item }: EditContentDialogProps) {
    const [open, setOpen] = useState(false)
    const [headline, setHeadline] = useState(item.headline || "")
    const [transcript, setTranscript] = useState(item.transcript || "")
    const [isApproved, setIsApproved] = useState(item.isApproved)
    const [isPending, startTransition] = useTransition()
    const router = useRouter()

    const handleSave = () => {
        startTransition(async () => {
            try {
                await updateContentItem(item.id, {
                    headline,
                    transcript,
                    isApproved
                })
                toast.success("Данные обновлены")
                setOpen(false)
                router.refresh()
            } catch (error) {
                toast.error("Ошибка обновления")
            }
        })
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="icon" variant="ghost">
                    <Icons.edit className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Редактирование контента</DialogTitle>
                    <DialogDescription>
                        Исправьте данные, извлеченные AI
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="headline">Заголовок (с обложки)</Label>
                        <Input
                            id="headline"
                            value={headline}
                            onChange={(e) => setHeadline(e.target.value)}
                            placeholder="Заголовок не найден"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="transcript">Сценарий / Транскрипция</Label>
                        <Textarea
                            id="transcript"
                            value={transcript}
                            onChange={(e) => setTranscript(e.target.value)}
                            className="min-h-[200px] font-mono text-sm"
                            placeholder="Текст видео..."
                        />
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                        <Switch
                            id="approved"
                            checked={isApproved}
                            onCheckedChange={setIsApproved}
                        />
                        <Label htmlFor="approved">Одобрено для использования в AI (Approved)</Label>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>
                        Отмена
                    </Button>
                    <Button onClick={handleSave} disabled={isPending}>
                        {isPending && <Icons.spinner className="h-4 w-4 mr-2 animate-spin" />}
                        Сохранить
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
