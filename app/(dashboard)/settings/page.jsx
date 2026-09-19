import { PageHeader } from "@/components/layout/page-header"
import { requireRole } from "@/features/auth/lib/session"
import { DemoReady } from "@/features/demo/components/demo-ready"
import { SettingsScreen } from "@/features/settings/components/settings-screen"

const SettingsPage = async () => {
  await requireRole("admin", "manager")

  return (
    <>
      <PageHeader title="Settings" description="Tax and discounts for the whole shop." />
      <DemoReady>
        <SettingsScreen />
      </DemoReady>
    </>
  )
}

export default SettingsPage