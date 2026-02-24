/**
 * Dataset Detail Page
 * 
 * View and manage sources and content items
 */

import { Suspense } from "react"
import { notFound } from "next/navigation"
import { getDataset } from "@/actions/datasets"
import { DatasetTabs } from "@/components/datasets/dataset-tabs"

interface DatasetPageProps {
    params: { id: string }
}

/** Async content — fetches heavy data inside Suspense boundary */
async function DatasetContent({ id }: { id: string }) {
    const dataset = await getDataset(id)

    if (!dataset) {
        return notFound()
    }

    return (
        <>
            <div className="mb-8">
                <h1 className="text-3xl font-bold">{dataset.name}</h1>
                {dataset.description && (
                    <p className="text-muted-foreground mt-2">
                        {dataset.description}
                    </p>
                )}
                {/* Analysis Stats */}
                {dataset.analysisStats && (
                    <div className="flex items-center gap-4 mt-3 text-sm">
                        <span className="text-muted-foreground">
                            📊 <span className="font-medium text-foreground">{dataset.analysisStats.total}</span> постов
                        </span>
                        <span className={dataset.analysisStats.missingHeadline > 0 ? "text-orange-400" : "text-emerald-400"}>
                            📝 {dataset.analysisStats.withHeadline}/{dataset.analysisStats.total} заголовков
                        </span>
                        <span className={dataset.analysisStats.missingTopic > 0 ? "text-orange-400" : "text-emerald-400"}>
                            🏷️ {dataset.analysisStats.withTopic}/{dataset.analysisStats.total} тем
                        </span>
                        <span className="text-muted-foreground">
                            🖼️ {dataset.analysisStats.withCover}/{dataset.analysisStats.total} обложек
                        </span>
                    </div>
                )}
            </div>

            <DatasetTabs
                datasetId={dataset.id}
                initialItems={dataset.items}
                sources={dataset.sources}
            />
        </>
    )
}

export default function DatasetPage({ params }: DatasetPageProps) {
    return (
        <div className="container py-8">
            <Suspense fallback={
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                    Загрузка датасета...
                </div>
            }>
                <DatasetContent id={params.id} />
            </Suspense>
        </div>
    )
}

