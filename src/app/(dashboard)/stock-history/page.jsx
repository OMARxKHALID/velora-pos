import { PageHeader } from "@/shared/components/layout/page-header"
import { requireRole } from "@/features/auth/server/session"
import { StockHistoryScreen } from "@/features/inventory/components/stock-history-screen"

export const metadata = { title: "Stock history" }

const StockHistoryPage = async () => {
  const user = await requireRole("admin", "manager")

  return (
    <>
      <PageHeader title="Stock history" description="Every item in and out, with who did it and why." />
      <StockHistoryScreen user={user} />
    </>
  )
}

export default StockHistoryPage
