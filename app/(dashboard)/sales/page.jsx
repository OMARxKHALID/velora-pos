import { PageHeader } from "@/components/layout/page-header"
import { requireRole } from "@/features/auth/server/session"
import { LedgerReady } from "@/features/ledger/components/ledger-ready"
import { SalesScreen } from "@/features/sales/components/sales-screen"

const SalesPage = async () => {
  const user = await requireRole()

  return (
    <>
      <PageHeader
        title="Sales"
        description={user.role === "cashier" ? "Your sales. Finished sales cannot be changed." : `Every sale, by shop. Finished sales cannot be changed.`}
      />
      <LedgerReady>
        <SalesScreen user={user} />
      </LedgerReady>
    </>
  )
}

export default SalesPage
