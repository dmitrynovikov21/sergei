import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/session"
import { getBillingDashboard } from "@/actions/billing"
import { BillingDashboard } from "./billing-client"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Биллинг",
  description: "Управление балансом и подписками",
}

export default async function BillingPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")

  const data = await getBillingDashboard()

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Биллинг</h2>
      </div>

      <BillingDashboard data={data} />
    </div>
  )
}
