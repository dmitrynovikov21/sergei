import { getFeedbackStats } from "@/actions/feedback"
import { FeedbackClient } from "./client"
import { Metadata } from "next"

export const metadata: Metadata = {
    title: "Feedback Analytics",
    description: "Likes, dislikes and user feedback",
}

export default async function FeedbackPage() {
    const stats = await getFeedbackStats()

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Обратная связь</h2>
            </div>

            <FeedbackClient stats={stats} />
        </div>
    )
}
