import { PageHeader } from "@/components/layout/page-header"
import { requireRole } from "@/features/auth/server/session"
import { DemoReady } from "@/features/demo/components/demo-ready"
import { RefundsScreen } from "@/features/refunds/components/refunds-screen"

const RefundsPage = async () => {
  const user = await requireRole("manager")

  return (
    <>
      <PageHeader title="Returns" description="Approve or reject returns requested by cashiers." />
      <DemoReady>
        <RefundsScreen user={user} />
      </DemoReady>
    </>
  )
}

export default RefundsPage
