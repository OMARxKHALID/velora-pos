import { PageHeader } from "@/shared/components/layout/page-header"
import { requireRole } from "@/features/auth/server/session"
import { MovementsScreen } from "@/features/inventory/components/movements-screen"

const MovementsPage = async () => {
  const user = await requireRole("admin", "manager")

  return (
    <>
      <PageHeader title="Stock history" description="Every item in and out, with who did it and why." />
      <MovementsScreen user={user} />
    </>
  )
}

export default MovementsPage
