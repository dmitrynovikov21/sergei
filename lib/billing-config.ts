/**
 * Billing Configuration
 * All tariff constants and pricing logic
 */

export const USD_TO_RUB = 80

export const CREDITS_PER_USD = 1000 // 1000 credits = $1 USD

export type TariffPlan = 'reels' | 'carousels'

export interface Tariff {
    name: string
    plan: TariffPlan
    priceRub: number       // Price for user
    costRub: number        // Our cost (Anthropic)
    credits: number        // Monthly credit limit
    agentPatterns: string[] // Agent name patterns to match
    referralPercent: number // 10% = 0.10
}

export const TARIFFS: Record<TariffPlan, Tariff> = {
    reels: {
        name: "Reels",
        plan: "reels",
        priceRub: 20,           // TEST PRICE (real: 2000)
        costRub: 10,            // TEST COST
        credits: 12500,         // $12.50 × 1000 = 12,500 credits
        agentPatterns: ["заголовки reels", "описание reels"],
        referralPercent: 0.10
    },
    carousels: {
        name: "Карусели",
        plan: "carousels",
        priceRub: 10,           // TEST PRICE (real: 1000)
        costRub: 5,             // TEST COST
        credits: 6250,          // $6.25 × 1000 = 6,250 credits
        agentPatterns: ["заголовки каруселей", "структура карусели"],
        referralPercent: 0.10
    }
}

/**
 * Check if an agent name matches a tariff plan
 */
export function getRequiredPlanForAgent(agentName: string): TariffPlan | null {
    const nameLower = agentName.toLowerCase()

    for (const [plan, tariff] of Object.entries(TARIFFS)) {
        for (const pattern of tariff.agentPatterns) {
            if (nameLower.includes(pattern)) {
                return plan as TariffPlan
            }
        }
    }

    return null // Agent doesn't require a specific plan
}

/**
 * Get tariff by plan
 */
export function getTariff(plan: TariffPlan): Tariff {
    return TARIFFS[plan]
}

/**
 * Calculate referral bonus for a purchase
 */
export function calculateReferralBonus(priceRub: number): number {
    return Math.round(priceRub * 0.10) // 10%
}
