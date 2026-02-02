/**
 * Datasets Admin Page
 * 
 * List and manage datasets for Instagram harvesting
 */

import { Suspense } from "react"
import { getDatasets } from "@/actions/datasets"
import { DatasetsList } from "@/components/datasets/datasets-list"
import { CreateDatasetDialog } from "@/components/datasets/create-dataset-dialog"

export const metadata = {
    title: "Датасеты",
    description: "Управление датасетами для AI",
}

export default async function DatasetsPage() {
    const datasets = await getDatasets()

    return (
        <div className="container py-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold">Датасеты</h1>
                    <p className="text-muted-foreground">
                        Управление базами знаний для AI агентов
                    </p>
                </div>
                <CreateDatasetDialog />
            </div>

            <Suspense fallback={<div>Loading...</div>}>
                <DatasetsList datasets={datasets} />
            </Suspense>
        </div>
    )
}
