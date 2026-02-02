"use server"

import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth-helpers"
import { revalidatePath } from "next/cache"
import { TARIFFS, TariffPlan, Tariff } from "@/lib/billing-config"

// Admin check
async function requireAdmin() {
    const user = await requireAuth()
    const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { role: true }
    })
    if (dbUser?.role !== 'admin') {
        throw new Error("Unauthorized: Admin access required")
    }
    return user
}

// Get setting value
async function getSetting(key: string): Promise<string | null> {
    const setting = await prisma.systemSettings.findUnique({ where: { key } })
    return setting?.value ?? null
}

// Set setting value
async function setSetting(key: string, value: string): Promise<void> {
    await prisma.systemSettings.upsert({
        where: { key },
        update: { value },
        create: { id: crypto.randomUUID(), key, value }
    })
}

// ==========================================
// Public: Get Dynamic Tariffs
// ==========================================

export interface DynamicTariff extends Tariff {
    priceRub: number
    credits: number
}

export async function getDynamicTariffs(): Promise<Record<TariffPlan, DynamicTariff>> {
    const plans: TariffPlan[] = ['reels', 'carousels']
    const result: Record<TariffPlan, DynamicTariff> = {} as any

    for (const plan of plans) {
        const baseTariff = TARIFFS[plan]
        const priceOverride = await getSetting(`tariff_${plan}_price`)
        const creditsOverride = await getSetting(`tariff_${plan}_credits`)

        result[plan] = {
            ...baseTariff,
            priceRub: priceOverride ? parseInt(priceOverride, 10) : baseTariff.priceRub,
            credits: creditsOverride ? parseInt(creditsOverride, 10) : baseTariff.credits
        }
    }

    return result
}

// ==========================================
// Admin: Update Tariff
// ==========================================

export async function updateTariffPrice(plan: TariffPlan, priceRub: number): Promise<void> {
    await requireAdmin()

    if (priceRub < 1 || priceRub > 100000) {
        throw new Error("Цена должна быть от 1 до 100000₽")
    }

    await setSetting(`tariff_${plan}_price`, priceRub.toString())
    revalidatePath('/admin/tariffs')
    revalidatePath('/dashboard/billing')
}

export async function updateTariffCredits(plan: TariffPlan, credits: number): Promise<void> {
    await requireAdmin()

    if (credits < 100 || credits > 1000000) {
        throw new Error("Кредиты должны быть от 100 до 1,000,000")
    }

    await setSetting(`tariff_${plan}_credits`, credits.toString())
    revalidatePath('/admin/tariffs')
    revalidatePath('/dashboard/billing')
}

// ==========================================
// Admin: Get All Settings
// ==========================================

export async function getAllTariffSettings() {
    await requireAdmin()

    const tariffs = await getDynamicTariffs()

    return {
        reels: tariffs.reels,
        carousels: tariffs.carousels
    }
}
