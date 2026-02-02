export interface Attachment {
    name: string
    type: string
    url: string
    isUploading?: boolean
}

export interface Message {
    id: string
    role: "user" | "assistant" | "system"
    content: string
    createdAt: Date
    attachments?: Attachment[]
}
