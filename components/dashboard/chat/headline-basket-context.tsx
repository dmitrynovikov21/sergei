"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"

interface HeadlineBasketContextType {
    headlines: string[]
    addHeadline: (headline: string) => void
    removeHeadline: (index: number) => void
    removeByText: (headline: string) => void
    hasHeadline: (headline: string) => boolean
    clearAll: () => void
    count: number
}

const HeadlineBasketContext = createContext<HeadlineBasketContextType | null>(null)

const STORAGE_KEY = "headline-basket"

export function HeadlineBasketProvider({ children }: { children: ReactNode }) {
    const [headlines, setHeadlines] = useState<string[]>([])

    // Load from localStorage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY)
            if (stored) setHeadlines(JSON.parse(stored))
        } catch { /* noop */ }
    }, [])

    // Persist to localStorage on change
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(headlines))
    }, [headlines])

    const addHeadline = useCallback((headline: string) => {
        setHeadlines(prev => {
            // Deduplicate
            if (prev.includes(headline)) return prev
            return [...prev, headline]
        })
    }, [])

    const removeHeadline = useCallback((index: number) => {
        setHeadlines(prev => prev.filter((_, i) => i !== index))
    }, [])

    const removeByText = useCallback((headline: string) => {
        setHeadlines(prev => prev.filter(h => h !== headline))
    }, [])

    const hasHeadline = useCallback((headline: string) => {
        return headlines.includes(headline)
    }, [headlines])

    const clearAll = useCallback(() => {
        setHeadlines([])
    }, [])

    return (
        <HeadlineBasketContext.Provider value={{
            headlines,
            addHeadline,
            removeHeadline,
            removeByText,
            hasHeadline,
            clearAll,
            count: headlines.length,
        }}>
            {children}
        </HeadlineBasketContext.Provider>
    )
}

export function useHeadlineBasket() {
    const ctx = useContext(HeadlineBasketContext)
    if (!ctx) throw new Error("useHeadlineBasket must be used within HeadlineBasketProvider")
    return ctx
}
