"use client"

import { useState, useEffect } from "react"
import { getAllTariffSettings, updateTariffPrice, updateTariffCredits, DynamicTariff } from "@/actions/tariffs"
import { TariffPlan } from "@/lib/billing-config"
import { toast } from "sonner"
import { Save, TrendingUp, Coins, Sparkles, LayoutGrid } from "lucide-react"

export default function AdminTariffsPage() {
    const [tariffs, setTariffs] = useState<Record<TariffPlan, DynamicTariff> | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [saving, setSaving] = useState<string | null>(null)

    // Local form state
    const [reelsPrice, setReelsPrice] = useState("")
    const [reelsCredits, setReelsCredits] = useState("")
    const [carouselsPrice, setCarouselsPrice] = useState("")
    const [carouselsCredits, setCarouselsCredits] = useState("")

    useEffect(() => {
        loadTariffs()
    }, [])

    const loadTariffs = async () => {
        try {
            const data = await getAllTariffSettings()
            setTariffs(data)
            setReelsPrice(data.reels.priceRub.toString())
            setReelsCredits(data.reels.credits.toString())
            setCarouselsPrice(data.carousels.priceRub.toString())
            setCarouselsCredits(data.carousels.credits.toString())
        } catch (error) {
            toast.error("Ошибка загрузки тарифов")
        } finally {
            setIsLoading(false)
        }
    }

    const handleSave = async (plan: TariffPlan, field: 'price' | 'credits') => {
        setSaving(`${plan}_${field}`)
        try {
            if (field === 'price') {
                const value = plan === 'reels' ? parseInt(reelsPrice) : parseInt(carouselsPrice)
                await updateTariffPrice(plan, value)
            } else {
                const value = plan === 'reels' ? parseInt(reelsCredits) : parseInt(carouselsCredits)
                await updateTariffCredits(plan, value)
            }
            toast.success("Сохранено!")
            loadTariffs()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Ошибка сохранения")
        } finally {
            setSaving(null)
        }
    }

    if (isLoading) {
        return (
            <div className="p-8">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-48 bg-gray-200 rounded"></div>
                </div>
            </div>
        )
    }

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">🎛️ Управление тарифами</h1>
            <p className="text-gray-600 mb-8">
                Здесь можно изменить цены и количество кредитов для подписок.
                Изменения применяются сразу для новых покупок.
            </p>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Reels Tariff */}
                <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-6 border border-orange-200">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-orange-500 rounded-lg">
                            <Sparkles className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold">Reels</h2>
                            <p className="text-sm text-gray-600">Заголовки и описания</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                <TrendingUp className="inline h-4 w-4 mr-1" />
                                Цена, ₽
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    value={reelsPrice}
                                    onChange={(e) => setReelsPrice(e.target.value)}
                                    className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                                />
                                <button
                                    onClick={() => handleSave('reels', 'price')}
                                    disabled={saving === 'reels_price'}
                                    className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
                                >
                                    {saving === 'reels_price' ? '...' : <Save className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                <Coins className="inline h-4 w-4 mr-1" />
                                Кредиты
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    value={reelsCredits}
                                    onChange={(e) => setReelsCredits(e.target.value)}
                                    className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                                />
                                <button
                                    onClick={() => handleSave('reels', 'credits')}
                                    disabled={saving === 'reels_credits'}
                                    className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
                                >
                                    {saving === 'reels_credits' ? '...' : <Save className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Carousels Tariff */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-blue-500 rounded-lg">
                            <LayoutGrid className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold">Карусели</h2>
                            <p className="text-sm text-gray-600">Структура и заголовки</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                <TrendingUp className="inline h-4 w-4 mr-1" />
                                Цена, ₽
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    value={carouselsPrice}
                                    onChange={(e) => setCarouselsPrice(e.target.value)}
                                    className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                                <button
                                    onClick={() => handleSave('carousels', 'price')}
                                    disabled={saving === 'carousels_price'}
                                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                                >
                                    {saving === 'carousels_price' ? '...' : <Save className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                <Coins className="inline h-4 w-4 mr-1" />
                                Кредиты
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    value={carouselsCredits}
                                    onChange={(e) => setCarouselsCredits(e.target.value)}
                                    className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                                <button
                                    onClick={() => handleSave('carousels', 'credits')}
                                    disabled={saving === 'carousels_credits'}
                                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                                >
                                    {saving === 'carousels_credits' ? '...' : <Save className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                <strong>⚠️ Внимание:</strong> Изменения применяются только для новых покупок.
                Существующие подписки сохранят старые условия до истечения срока.
            </div>
        </div>
    )
}
