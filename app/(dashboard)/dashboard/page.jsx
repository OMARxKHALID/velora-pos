import { PageHeader } from "@/components/layout/page-header"
import { DashboardScreen } from "@/features/analytics/components/dashboard-screen"
import { requireRole } from "@/features/auth/server/session"
import { LedgerReady } from "@/features/ledger/components/ledger-ready"

const DashboardPage = async () => {
  const user = await requireRole("admin")

  return (
    <>
      <PageHeader title="Overview" description="How your shops are doing." />
      <LedgerReady skeleton="panels">
        <DashboardScreen user={user} />
      </LedgerReady>
    </>
  )
}

export default DashboardPage
