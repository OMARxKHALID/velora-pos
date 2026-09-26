import { PageHeader } from "@/shared/components/layout/page-header"
import { requireRole } from "@/features/auth/server/session"
import { LedgerReady } from "@/features/ledger/components/ledger-ready"
import { StockScreen } from "@/features/inventory/components/stock-screen"

export const metadata = { title: "Stock" }

const StockPage = async () => {
  const user = await requireRole("admin", "manager")

  return (
    <>
      <PageHeader title="Stock" description="What is on hand for every product and size." />
      <LedgerReady>
        <StockScreen user={user} />
      </LedgerReady>
    </>
  )
}

export default StockPage
