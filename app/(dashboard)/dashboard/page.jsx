import { PageHeader } from "@/components/layout/page-header"
import { DashboardScreen } from "@/features/analytics/components/dashboard-screen"
import { requireRole } from "@/features/auth/lib/session"
import { DemoReady } from "@/features/demo/components/demo-ready"

const DashboardPage = async () => {
  const user = await requireRole("admin", "manager")

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={user.role === "admin" ? "Velora Group · Velora Shoes. More shops appear here as they come online." : "How Velora Shoes is doing."}
      />
      <DemoReady>
        <DashboardScreen />
      </DemoReady>
    </>
  )
}

export default DashboardPage
