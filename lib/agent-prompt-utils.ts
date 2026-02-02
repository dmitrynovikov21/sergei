
export const SETTINGS_SECTION_HEADER = "--- НАСТРОЙКИ ОПИСАНИЯ (АВТОМАТИЧЕСКИЕ) ---"
export const SETTINGS_SECTION_FOOTER = "--- КОНЕЦ НАСТРОЕК ---"


export interface AgentSettings {
    useEmoji: boolean
    useSubscribe: boolean
    useLinkInBio: boolean
    subscribeLink: string
    codeWord: string
    audienceQuestion: string
    useAudienceQuestion: boolean // New field
}

export function buildSettingsBlock(settings: AgentSettings): string {
    const parts: string[] = []

    parts.push(SETTINGS_SECTION_HEADER)

    if (settings.useEmoji) {
        parts.push("\nЭМОДЗИ:")
        parts.push("Добавляй в текст эмодзи, где это уместно, но без фанатизма. Например вместо пунктов в тексте, можно сделать соответствующие эмодзи, но если подразумевается нумерованный список, то сделай цифры, а не эмодзи.")
    }

    const userLink = settings.subscribeLink || "@ваш_ник"

    if (settings.useSubscribe && settings.useLinkInBio) {
        parts.push("\nПРИЗЫВ ПОДПИСАТЬСЯ:")
        parts.push(`В конце каждого ответа должен быть призыв подписаться на этот аккаунт: ${userLink} и проверить ссылку в шапке профиля. Важно чтобы это было нативно.`)
    } else if (settings.useSubscribe) {
        parts.push("\nПРИЗЫВ ПОДПИСАТЬСЯ:")
        parts.push(`В конце каждого ответа должен быть призыв подписаться на этот аккаунт: ${userLink}. Важно чтобы это было нативно.`)
    } else if (settings.useLinkInBio) {
        parts.push("\nССЫЛКА В ШАПКЕ:")
        parts.push(`Упомяни что полезная информация есть в ТГ по ссылке в шапке профиля.`)
    }

    if (settings.codeWord) {
        parts.push("\nКОДОВОЕ СЛОВО:")
        parts.push(`Добавь призыв написать кодовое слово "${settings.codeWord}" в директ/комментарии.`)
    }

    if (settings.useAudienceQuestion) {
        parts.push("\nВОПРОС АУДИТОРИИ:")
        parts.push("Также важно, чтобы ты заканчивал пост виральным вопросом к зрителям по теме поста. Используй перед вопросом эмоджи ❓")

        if (settings.audienceQuestion) {
            parts.push(`Конкретная формулировка вопроса: "${settings.audienceQuestion}"`)
        }
    }

    // Always add this formatting rule for Description Agents
    parts.push("\nФОРМАТ ВЫВОДА:")
    parts.push("1. Максимальная длина описания: 2200 символов.")
    parts.push("2. КАЖДОЕ описание оборачивай в маркеры: 【DESC】...【/DESC】")
    parts.push("Пример: 【DESC】Текст описания...【/DESC】")

    parts.push(SETTINGS_SECTION_FOOTER)

    return parts.join("\n")
}

export function updateSystemPrompt(currentPrompt: string, settings: AgentSettings): string {
    const newBlock = buildSettingsBlock(settings)

    // Check if block exists
    const startIndex = currentPrompt.indexOf(SETTINGS_SECTION_HEADER)
    const endIndex = currentPrompt.indexOf(SETTINGS_SECTION_FOOTER)

    if (startIndex !== -1 && endIndex !== -1) {
        // Replace existing block
        const before = currentPrompt.substring(0, startIndex).trim()
        const after = currentPrompt.substring(endIndex + SETTINGS_SECTION_FOOTER.length).trim()

        // Clean up newlines
        return `${before}\n\n${newBlock}\n\n${after}`.trim()
    } else {
        // Append to end
        return `${currentPrompt.trim()}\n\n${newBlock}`
    }
}
