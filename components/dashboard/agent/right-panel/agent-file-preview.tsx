"use client"

import { FileText, Image as ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { AgentFile } from "@prisma/client"

interface AgentFilePreviewProps {
    file: AgentFile | null
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function AgentFilePreview({ file, open, onOpenChange }: AgentFilePreviewProps) {
    if (!file) return null

    const isImageFile = (filename: string) => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(filename)
    const isPdfFile = (filename: string) => /\.pdf$/i.test(filename)

    const getFileIcon = (filename: string) => {
        if (isImageFile(filename)) return <ImageIcon className="h-4 w-4 text-blue-500" />
        if (isPdfFile(filename)) return <FileText className="h-4 w-4 text-red-500" />
        return <FileText className="h-4 w-4 text-zinc-500" />
    }

    const renderContent = () => {
        const isImage = file.content.startsWith('data:image') || isImageFile(file.name)
        const isPdf = isPdfFile(file.name)

        if (isImage && file.content.startsWith('data:image')) {
            return (
                <div className="flex items-center justify-center p-4">
                    <img
                        src={file.content}
                        alt={file.name}
                        className="max-w-full max-h-[70vh] rounded-lg object-contain"
                    />
                </div>
            )
        }

        if (isPdf) {
            return (
                <div className="p-0 h-[70vh] w-full flex flex-col">
                    <iframe
                        src={file.content}
                        className="flex-1 w-full h-full border-none rounded-b-lg"
                        title={file.name}
                    />
                </div>
            )
        }

        return (
            <div className="p-4">
                <pre className="bg-zinc-100 dark:bg-zinc-800 rounded-lg p-4 text-sm overflow-auto max-h-[60vh] whitespace-pre-wrap font-mono">
                    {file.content}
                </pre>
            </div>
        )
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[85vh] overflow-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {getFileIcon(file.name)}
                        {file.name}
                    </DialogTitle>
                </DialogHeader>
                {renderContent()}
            </DialogContent>
        </Dialog>
    )
}
