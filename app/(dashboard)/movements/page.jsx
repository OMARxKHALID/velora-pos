import { PageHeader } from "@/components/layout/page-header"
import { requireRole } from "@/features/auth/lib/session"
import { DemoReady } from "@/features/demo/components/demo-ready"
import { MovementsScreen } from "@/features/inventory/components/movements-screen"

const MovementsPage = async () => {
  const user = await requireRole("admin", "manager")

  return (
    <>
      <PageHeader title="Stock history" description="Every item in and out, with who did it and why." />
      <DemoReady>
        <MovementsScreen user={user} />
      </DemoReady>
    </>
  )
}

export default MovementsPage
