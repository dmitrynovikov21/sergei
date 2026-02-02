export const UserRole = {
    ADMIN: "ADMIN",
    USER: "USER",
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const MessageRole = {
    user: "user",
    assistant: "assistant",
    system: "system",
} as const;

export type MessageRole = (typeof MessageRole)[keyof typeof MessageRole];
