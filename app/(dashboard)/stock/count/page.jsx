import { PageHeader } from "@/components/layout/page-header"
import { requireRole } from "@/features/auth/server/session"
import { LedgerReady } from "@/features/ledger/components/ledger-ready"
import { StockCountScreen } from "@/features/inventory/components/stock-count-screen"

const StockCountPage = async () => {
  const user = await requireRole("manager")

  return (
    <>
      <PageHeader title="Stock count" description="Scan every item on the shelf, then review what differs from the system." />
      <LedgerReady>
        <StockCountScreen user={user} />
      </LedgerReady>
    </>
  )
}

export default StockCountPage
