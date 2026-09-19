import { PageHeader } from "@/components/layout/page-header"
import { requireRole } from "@/features/auth/lib/session"
import { DemoReady } from "@/features/demo/components/demo-ready"
import { SalesScreen } from "@/features/sales/components/sales-screen"

const SalesPage = async () => {
  const user = await requireRole()

  return (
    <>
      <PageHeader
        title="Sales"
        description={user.role === "cashier" ? "Your sales. Finished sales are locked; use a refund to correct one." : "Every sale at Velora Shoes. Finished sales are locked; corrections go through refunds."}
      />
      <DemoReady>
        <SalesScreen user={user} />
      </DemoReady>
    </>
  )
}

export default SalesPage
