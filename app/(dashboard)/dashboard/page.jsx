import { PageHeader } from "@/components/layout/page-header"
import { DashboardScreen } from "@/features/analytics/components/dashboard-screen"
import { requireRole } from "@/features/auth/lib/session"
import { DemoReady } from "@/features/demo/components/demo-ready"

const DashboardPage = async () => {
  await requireRole("admin")

  return (
    <>
      <PageHeader title="Overview" description="How the Shoe Shop is doing." />
      <DemoReady>
        <DashboardScreen />
      </DemoReady>
    </>
  )
}

export default DashboardPage
