import { PageHeader } from "@/components/layout/page-header"
import { requireRole } from "@/features/auth/server/session"
import { DemoReady } from "@/features/demo/components/demo-ready"
import { StaffScreen } from "@/features/staff/components/staff-screen"

const StaffPage = async () => {
  await requireRole("admin")

  return (
    <>
      <PageHeader title="Staff" description="Add people, change their role, or turn off their access in one click." />
      <DemoReady>
        <StaffScreen />
      </DemoReady>
    </>
  )
}

export default StaffPage
