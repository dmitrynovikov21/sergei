import { useState } from "react"
import { toast } from "sonner"

export interface Attachment {
    name: string
    type: string
    url: string
    isUploading?: boolean
}

export function useFileUpload() {
    const [attachments, setAttachments] = useState<Attachment[]>([])

    const uploadFile = async (file: File) => {
        const tempId = Math.random().toString(36).substring(7)
        const reader = new FileReader()

        return new Promise<void>((resolve) => {
            reader.onload = async (e) => {
                const previewUrl = e.target?.result as string

                // Add optimistic upload
                setAttachments(prev => [...prev, {
                    name: file.name,
                    type: file.type,
                    url: previewUrl,
                    isUploading: true
                }])

                try {
                    // Upload to server
                    const formData = new FormData()
                    formData.append('file', file)

                    const res = await fetch('/api/upload', {
                        method: 'POST',
                        body: formData
                    })

                    if (!res.ok) throw new Error('Upload failed')

                    const data = await res.json()

                    // Keep the data URL (previewUrl) for AI - server URL is for reference only
                    // AI needs data:image/...;base64,... format, NOT /uploads/xxx.png
                    setAttachments(prev => prev.map(att =>
                        att.url === previewUrl ? { ...att, isUploading: false } : att
                    ))
                } catch (error) {
                    console.error('Upload failed:', error)
                    toast.error(`Ошибка загрузки: ${file.name}`)
                    // Remove failed attachment
                    setAttachments(prev => prev.filter(att => att.url !== previewUrl))
                } finally {
                    resolve()
                }
            }
            reader.readAsDataURL(file)
        })
    }

    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index))
    }

    const clearAttachments = () => {
        setAttachments([])
    }

    return {
        attachments,
        uploadFile,
        removeAttachment,
        clearAttachments,
        setAttachments
    }
}
