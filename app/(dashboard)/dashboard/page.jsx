import { PageHeader } from "@/components/layout/page-header"
import { DashboardScreen } from "@/features/analytics/components/dashboard-screen"
import { requireRole } from "@/features/auth/server/session"
import { DemoReady } from "@/features/demo/components/demo-ready"

const DashboardPage = async () => {
  const user = await requireRole("admin")

  return (
    <>
      <PageHeader title="Overview" description="How your shops are doing." />
      <DemoReady>
        <DashboardScreen user={user} />
      </DemoReady>
    </>
  )
}

export default DashboardPage
