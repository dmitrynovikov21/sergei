"use client"

import { HeadlineBasketProvider } from "@/components/dashboard/chat/headline-basket-context"
import { HeadlineBasketWidget } from "@/components/dashboard/chat/headline-basket-widget"

export function HeadlineBasketWrapper({ children }: { children: React.ReactNode }) {
    return (
        <HeadlineBasketProvider>
            {children}
            <HeadlineBasketWidget />
        </HeadlineBasketProvider>
    )
}
