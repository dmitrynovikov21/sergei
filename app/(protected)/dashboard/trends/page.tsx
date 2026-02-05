import { DashboardHeader } from "@/components/dashboard/header";
import { StatsGrowthChart } from "@/components/trends/stats-growth-chart";
import { TrendsTable } from "@/components/trends/trends-table";
import { getTrendsData, getAllContentItems } from "@/actions/trends";

export const metadata = {
    title: "Trends",
    description: "Instagram Trends Analysis",
};

export default async function TrendsPage() {
    const [{ dailyStats, totals }, contentItems] = await Promise.all([
        getTrendsData(),
        getAllContentItems()
    ]);

    return (
        <div className="container py-8">
            <DashboardHeader heading="Тренды" text="База контента со всех источников. Фильтруй и находи виральный контент." />
            <div className="grid gap-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {/* Stats cards */}
                    <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
                        <h3 className="font-semibold leading-none tracking-tight text-sm text-muted-foreground">Всего постов</h3>
                        <div className="text-2xl font-bold mt-2">{totals.posts}</div>
                    </div>
                    <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
                        <h3 className="font-semibold leading-none tracking-tight text-sm text-muted-foreground">Всего просмотров</h3>
                        <div className="text-2xl font-bold mt-2">{totals.views.toLocaleString()}</div>
                    </div>
                    <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
                        <h3 className="font-semibold leading-none tracking-tight text-sm text-muted-foreground">Средние просмотры</h3>
                        <div className="text-2xl font-bold mt-2">{totals.avgViews.toLocaleString()}</div>
                    </div>
                    <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
                        <h3 className="font-semibold leading-none tracking-tight text-sm text-muted-foreground">Виральные</h3>
                        <div className="text-2xl font-bold mt-2">{totals.highViralityCount}</div>
                    </div>
                </div>

                {/* Content Table */}
                <div className="mt-6 min-w-0">
                    <h2 className="text-lg font-semibold mb-4">База контента</h2>
                    <TrendsTable items={contentItems} />
                </div>
            </div>
        </div>
    );
}
