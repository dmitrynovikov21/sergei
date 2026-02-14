import { DashboardHeader } from "@/components/dashboard/header";
import { TrendsTable } from "@/components/trends/trends-table";
import { getAllContentItems } from "@/actions/trends";

export const metadata = {
    title: "Trends",
    description: "Instagram Trends Analysis",
};

export default async function TrendsPage() {
    const contentItems = await getAllContentItems();

    // Compute stats from the SAME deduplicated data the table uses
    const totalPosts = contentItems.length;
    const totalViews = contentItems.reduce((sum, item) => sum + item.views, 0);
    const avgViews = totalPosts > 0 ? Math.round(totalViews / totalPosts) : 0;
    const highViralityCount = contentItems.filter(i => i.views > (avgViews * 2)).length;

    return (
        <div className="container py-8">
            <DashboardHeader heading="Тренды" text="База контента со всех источников. Фильтруй и находи виральный контент." />
            <div className="grid gap-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {/* Stats cards */}
                    <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
                        <h3 className="font-semibold leading-none tracking-tight text-sm text-muted-foreground">Всего постов</h3>
                        <div className="text-2xl font-bold mt-2">{totalPosts.toLocaleString()}</div>
                    </div>
                    <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
                        <h3 className="font-semibold leading-none tracking-tight text-sm text-muted-foreground">Всего просмотров</h3>
                        <div className="text-2xl font-bold mt-2">{totalViews.toLocaleString()}</div>
                    </div>
                    <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
                        <h3 className="font-semibold leading-none tracking-tight text-sm text-muted-foreground">Средние просмотры</h3>
                        <div className="text-2xl font-bold mt-2">{avgViews.toLocaleString()}</div>
                    </div>
                    <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
                        <h3 className="font-semibold leading-none tracking-tight text-sm text-muted-foreground">Виральные</h3>
                        <div className="text-2xl font-bold mt-2">{highViralityCount.toLocaleString()}</div>
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
