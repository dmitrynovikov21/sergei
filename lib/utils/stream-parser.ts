/**
 * Stream Parsing Utilities for Chat Interface
 * 
 * Extracts common SSE parsing logic from chat-interface.tsx
 */

export interface StreamChunk {
    type: 'text-delta' | 'reasoning-delta' | 'tool-call' | 'tool-result' | 'unknown'
    content?: string
    toolName?: string
}

/**
 * Parse a single SSE line into a structured StreamChunk
 */
export function parseSSELine(line: string): StreamChunk | null {
    if (!line.trim()) return null

    // Handle SSE format: "data: {...json...}"
    let jsonStr = line
    if (line.startsWith('data:')) {
        jsonStr = line.slice(5).trim()
    }

    if (!jsonStr || jsonStr === '[DONE]') return null

    try {
        const data = JSON.parse(jsonStr)

        if (data.type === 'text-delta') {
            return {
                type: 'text-delta',
                content: data.textDelta || data.delta || ''
            }
        }

        if (data.type === 'reasoning-delta') {
            return {
                type: 'reasoning-delta',
                content: data.textDelta || data.delta || ''
            }
        }

        if (data.type === 'tool-call') {
            return {
                type: 'tool-call',
                toolName: data.toolName || data.name || 'инструмент'
            }
        }

        if (data.type === 'tool-result') {
            return { type: 'tool-result' }
        }

        return { type: 'unknown' }
    } catch {
        return null
    }
}

/**
 * Extract last meaningful sentence from reasoning text for status display
 * Returns a shortened version (max 10-12 words)
 */
export function extractStatusFromReasoning(
    reasoning: string,
    maxWords: number = 10
): string {
    if (!reasoning || reasoning.length < 15) return ''

    // Split by sentence endings
    const sentences = reasoning.split(/(?<=[.!?。])\s+/)

    // Find last sentence with meaningful content (>15 chars)
    const lastSentence = sentences
        .filter(s => s.trim().length > 15)
        .pop()

    if (!lastSentence) return ''

    // Take first N words
    const words = lastSentence.trim().split(/\s+/).slice(0, maxWords)
    let status = words.join(' ')

    // Add ellipsis if truncated
    if (lastSentence.split(/\s+/).length > maxWords) {
        status += '...'
    }

    return status
}

/**
 * Build display content with thinking block
 */
export function buildDisplayContent(
    fullText: string,
    fullReasoning: string,
    status: string
): string {
    const statusToShow = status ||
        extractStatusFromReasoning(fullReasoning, 12) ||
        'Думаю...'

    const thinkingData = JSON.stringify({
        status: statusToShow,
        full: fullReasoning
    })

    let displayContent: string
    if (fullText) {
        displayContent = `<thinking>${thinkingData}</thinking>\n\n${fullText}`
    } else {
        displayContent = `<thinking>${thinkingData}</thinking>`
    }

    // Clean trailing artifacts
    return displayContent
        .replace(/\n---\s*$/, '')
        .replace(/\n_+\s*$/, '')
}

/**
 * Process buffer and extract complete lines
 * Returns [completeLines, remainingBuffer]
 */
export function extractLinesFromBuffer(buffer: string): [string[], string] {
    const lines = buffer.split('\n')
    const remaining = lines.pop() || ''
    return [lines, remaining]
}
