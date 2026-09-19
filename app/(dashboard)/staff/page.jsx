import { PageHeader } from "@/components/layout/page-header"
import { getDisabledStaff, requireRole } from "@/features/auth/lib/session"
import { DemoReady } from "@/features/demo/components/demo-ready"
import { StaffScreen } from "@/features/staff/components/staff-screen"

const StaffPage = async () => {
  await requireRole("admin")
  const disabled = await getDisabledStaff()

  return (
    <>
      <PageHeader title="Staff" description="Turn off someone's access to the whole system in one click." />
      <DemoReady>
        <StaffScreen disabled={disabled} />
      </DemoReady>
    </>
  )
}

export default StaffPage
