import { PageHeader } from "@/components/layout/page-header"
import { requireRole } from "@/features/auth/lib/session"
import { DemoReady } from "@/features/demo/components/demo-ready"
import { MovementsScreen } from "@/features/inventory/components/movements-screen"

const MovementsPage = async () => {
  await requireRole("admin", "manager")

  return (
    <>
      <PageHeader title="Stock movements" description="Every pair in and out: sales, returns, deliveries and adjustments, with who and why." />
      <DemoReady>
        <MovementsScreen />
      </DemoReady>
    </>
  )
}

export default MovementsPage
