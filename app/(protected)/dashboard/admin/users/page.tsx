import { getAllUsersWithMetrics } from "@/actions/admin"
import { AdminUsersClient } from "./client"
import { Metadata } from "next"

export const metadata: Metadata = {
    title: "Admin Users",
    description: "Manage users and view spending metrics",
}

export default async function AdminUsersPage() {
    const users = await getAllUsersWithMetrics()

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Users & Metrics</h2>
            </div>

            <AdminUsersClient users={users} />
        </div>
    )
}
