import { DashboardHeader } from "@/components/dashboard/header"
import { DashboardShell } from "@/components/dashboard/shell"
import { PayoutsTable } from "./client"
import { getPayoutRequests } from "@/actions/admin-payouts"

export const metadata = {
    title: "Управление выплатами",
    description: "Админ-панель для управления заявками на вывод средств",
}

export default async function AdminPayoutsPage() {
    const requests = await getPayoutRequests()

    return (
        <DashboardShell>
            <DashboardHeader
                heading="Заявки на вывод"
                text="Управление заявками на вывод реферальных средств"
            />
            <PayoutsTable requests={requests} />
        </DashboardShell>
    )
}
