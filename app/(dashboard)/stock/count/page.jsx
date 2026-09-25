import { PageHeader } from "@/components/layout/page-header"
import { requireRole } from "@/features/auth/lib/session"
import { DemoReady } from "@/features/demo/components/demo-ready"
import { StockCountScreen } from "@/features/inventory/components/stock-count-screen"

const StockCountPage = async () => {
  const user = await requireRole("manager")

  return (
    <>
      <PageHeader title="Stock count" description="Scan every item on the shelf, then review what differs from the system." />
      <DemoReady>
        <StockCountScreen user={user} />
      </DemoReady>
    </>
  )
}

export default StockCountPage
