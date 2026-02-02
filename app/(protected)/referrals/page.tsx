
import { DashboardHeader } from "@/components/dashboard/header"
import { DashboardShell } from "@/components/dashboard/shell"
import { ReferralDashboardClient } from "./client"
import { getReferralStats } from "@/actions/referrals"

export const metadata = {
    title: "Партнёрская программа",
    description: "Приглашайте друзей и зарабатывайте.",
}

export default async function ReferralPage() {
    const stats = await getReferralStats()

    return (
        <DashboardShell>
            <DashboardHeader heading="Партнёрская программа" text="Приглашайте друзей и получайте 30% с каждой их покупки." />
            <div className="grid gap-10">
                <ReferralDashboardClient stats={stats} />
            </div>
        </DashboardShell>
    )
}

