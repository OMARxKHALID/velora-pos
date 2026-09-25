import { PageHeader } from "@/components/layout/page-header"
import { requireRole } from "@/features/auth/server/session"
import { LedgerReady } from "@/features/ledger/components/ledger-ready"
import { StockScreen } from "@/features/inventory/components/stock-screen"

const StockPage = async () => {
  const user = await requireRole("admin", "manager")

  return (
    <>
      <PageHeader title="Stock" description="Pairs on hand for every shoe and size." />
      <LedgerReady>
        <StockScreen user={user} />
      </LedgerReady>
    </>
  )
}

export default StockPage
