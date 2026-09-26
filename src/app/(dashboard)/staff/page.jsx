import { PageHeader } from "@/shared/components/layout/page-header"
import { requireRole } from "@/features/auth/server/session"
import { LedgerReady } from "@/features/ledger/components/ledger-ready"
import { StaffScreen } from "@/features/staff/components/staff-screen"

const StaffPage = async () => {
  const user = await requireRole("admin")

  return (
    <>
      <PageHeader title="Staff" description="Add people, change their role, or turn off their access in one click." />
      <LedgerReady>
        <StaffScreen user={user} />
      </LedgerReady>
    </>
  )
}

export default StaffPage
