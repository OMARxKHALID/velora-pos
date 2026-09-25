import { PageHeader } from "@/components/layout/page-header"
import { requireRole } from "@/features/auth/server/session"
import { LedgerReady } from "@/features/ledger/components/ledger-ready"
import { RefundsScreen } from "@/features/refunds/components/refunds-screen"

const RefundsPage = async () => {
  const user = await requireRole("manager")

  return (
    <>
      <PageHeader title="Returns" description="Approve or reject returns requested by cashiers." />
      <LedgerReady>
        <RefundsScreen user={user} />
      </LedgerReady>
    </>
  )
}

export default RefundsPage
