/**
 * Dataset Detail Page
 * 
 * View and manage sources and content items
 */

import { notFound } from "next/navigation"
import { getDataset } from "@/actions/datasets"
import { DatasetTabs } from "@/components/datasets/dataset-tabs"

interface DatasetPageProps {
    params: { id: string }
}

export default async function DatasetPage({ params }: DatasetPageProps) {
    const dataset = await getDataset(params.id)

    if (!dataset) {
        return notFound()
    }

    return (
        <div className="container py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold">{dataset.name}</h1>
                {dataset.description && (
                    <p className="text-muted-foreground mt-2">
                        {dataset.description}
                    </p>
                )}
            </div>

            <DatasetTabs
                datasetId={dataset.id}
                initialItems={dataset.items}
                sources={dataset.sources}
            />
        </div>
    )
}
