import { PageHeader } from "@/components/layout/page-header"
import { requireRole } from "@/features/auth/lib/session"
import { DemoReady } from "@/features/demo/components/demo-ready"
import { StockScreen } from "@/features/inventory/components/stock-screen"

const StockPage = async () => {
  const user = await requireRole("admin", "manager")

  return (
    <>
      <PageHeader title="Stock" description="Pairs on hand per size and colour at Velora Shoes." />
      <DemoReady>
        <StockScreen user={user} />
      </DemoReady>
    </>
  )
}

export default StockPage
