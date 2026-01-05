"use client"

import React, { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { createProject } from "@/actions/projects"
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
import { Icons } from "@/components/shared/icons"
import { toast } from "sonner"

interface CreateProjectDialogProps {
    trigger?: React.ReactNode
}

export function CreateProjectDialog({ trigger }: CreateProjectDialogProps) {
    const [open, setOpen] = useState(false)
    const [name, setName] = useState("")
    const [isPending, startTransition] = useTransition()
    const router = useRouter()

    const onSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim()) return

        startTransition(async () => {
            try {
                await createProject(name)
                setOpen(false)
                setName("")
                toast.success("Проект создан")
                router.refresh()
            } catch (error) {
                toast.error("Не удалось создать проект")
            }
        })
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="ghost" className="w-full justify-start text-zinc-500 hover:text-zinc-900 px-2 h-8 text-sm font-normal">
                        <Icons.add className="mr-2 h-4 w-4" />
                        Новый проект
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Создать проект</DialogTitle>
                    <DialogDescription>
                        Организуйте свои чаты в папки проектов.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={onSubmit} className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Название</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="напр. Маркетинг 2024"
                            disabled={isPending}
                        />
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={isPending || !name.trim()}>
                            {isPending ? "Создание..." : "Создать проект"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
