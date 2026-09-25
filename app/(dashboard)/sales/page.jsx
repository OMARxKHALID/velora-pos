import { PageHeader } from "@/components/layout/page-header"
import { SHOP_NAME } from "@/features/shops/lib/constants"
import { requireRole } from "@/features/auth/server/session"
import { DemoReady } from "@/features/demo/components/demo-ready"
import { SalesScreen } from "@/features/sales/components/sales-screen"

const SalesPage = async () => {
  const user = await requireRole()

  return (
    <>
      <PageHeader
        title="Sales"
        description={user.role === "cashier" ? "Your sales. Finished sales cannot be changed." : `Every sale at the ${SHOP_NAME}. Finished sales cannot be changed.`}
      />
      <DemoReady>
        <SalesScreen user={user} />
      </DemoReady>
    </>
  )
}

export default SalesPage
