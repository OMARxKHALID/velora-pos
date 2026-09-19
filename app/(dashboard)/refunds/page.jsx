import { PageHeader } from "@/components/layout/page-header"
import { requireRole } from "@/features/auth/lib/session"
import { DemoReady } from "@/features/demo/components/demo-ready"
import { RefundsScreen } from "@/features/refunds/components/refunds-screen"

const RefundsPage = async () => {
  const user = await requireRole("admin", "manager")

  return (
    <>
      <PageHeader title="Refunds" description="Cashiers request, managers approve. Stock goes back only after approval." />
      <DemoReady>
        <RefundsScreen user={user} />
      </DemoReady>
    </>
  )
}

export default RefundsPage
