/**
 * Create Dataset Dialog
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
import { Icons } from "@/components/shared/icons"
import { createDataset } from "@/actions/datasets"
import { toast } from "sonner"

export function CreateDatasetDialog() {
    const [open, setOpen] = useState(false)
    const [name, setName] = useState("")
    const [description, setDescription] = useState("")
    const [isPending, startTransition] = useTransition()
    const router = useRouter()

    const handleCreate = () => {
        if (!name.trim()) return

        startTransition(async () => {
            try {
                const dataset = await createDataset(name, description || undefined)
                toast.success("Датасет создан")
                setOpen(false)
                setName("")
                setDescription("")
                router.push(`/dashboard/datasets/${dataset.id}`)
            } catch (error) {
                toast.error("Не удалось создать датасет")
            }
        })
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Icons.add className="h-4 w-4 mr-2" />
                    Создать датасет
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Новый датасет</DialogTitle>
                    <DialogDescription>
                        Создайте контейнер для сбора контента из Instagram
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Название</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Тренды Reels Недвижимость"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">Описание (опционально)</Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Лучшие рилсы по теме недвижимости"
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>
                        Отмена
                    </Button>
                    <Button onClick={handleCreate} disabled={isPending || !name.trim()}>
                        {isPending && <Icons.spinner className="h-4 w-4 mr-2 animate-spin" />}
                        Создать
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
