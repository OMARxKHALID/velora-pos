import { PageHeader } from "@/shared/components/layout/page-header"
import { DashboardScreen } from "@/features/analytics/components/dashboard-screen"
import { requireRole } from "@/features/auth/server/session"

export const metadata = { title: "Overview" }

const DashboardPage = async () => {
  const user = await requireRole("admin")

  return (
    <>
      <PageHeader title="Overview" description="How your shops are doing." />
      <DashboardScreen user={user} />
    </>
  )
}

export default DashboardPage
