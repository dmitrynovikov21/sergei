"use client"

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react'

type HeaderData = {
    title: string
    icon?: React.ReactNode
    description?: string
    settingsButton?: React.ReactNode
} | null

type HeaderContextType = {
    headerData: HeaderData
    setHeaderData: (data: HeaderData) => void
}

const HeaderContext = createContext<HeaderContextType | undefined>(undefined)

export function HeaderProvider({ children }: { children: ReactNode }) {
    const [headerData, setHeaderData] = useState<HeaderData>(null)

    return (
        <HeaderContext.Provider value={{ headerData, setHeaderData }}>
            {children}
        </HeaderContext.Provider>
    )
}

export function useHeader() {
    const context = useContext(HeaderContext)
    if (!context) throw new Error("useHeader must be used within HeaderProvider")
    return context
}

export function HeaderDisplay() {
    const { headerData } = useHeader()

    if (!headerData) return <div className="flex-1" />

    return (
        <div className="flex-1 flex items-center justify-between min-w-0">
            <div className="flex items-center gap-2 px-2">
                {headerData.icon && (
                    <div className="flex items-center justify-center text-lg">
                        {headerData.icon}
                    </div>
                )}
                <div className="flex flex-col justify-center">
                    <h1 className="text-base font-semibold leading-none truncate text-zinc-900 dark:text-white">{headerData.title}</h1>
                </div>
            </div>
            {headerData.settingsButton && (
                <div className="flex items-center">
                    {headerData.settingsButton}
                </div>
            )}
        </div>
    )
}

export function HeaderUpdater({ title, icon, description, settingsButton }: {
    title: string
    icon?: React.ReactNode
    description?: string
    settingsButton?: React.ReactNode
}) {
    const { setHeaderData } = useHeader()

    useEffect(() => {
        // Set immediate
        setHeaderData({ title, icon, description, settingsButton })

        // Cleanup on unmount
        return () => setHeaderData(null)
    }, [title, icon, description, settingsButton, setHeaderData])

    return null
}
