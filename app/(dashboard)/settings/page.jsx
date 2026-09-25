import { PageHeader } from "@/components/layout/page-header"
import { requireRole } from "@/features/auth/lib/session"
import { DemoReady } from "@/features/demo/components/demo-ready"
import { SettingsScreen } from "@/features/settings/components/settings-screen"

const SettingsPage = async () => {
  const user = await requireRole("admin")

  return (
    <>
      <PageHeader title="Settings" description="Shops, counters, tax, payments, discounts and receipts." />
      <DemoReady>
        <SettingsScreen user={user} />
      </DemoReady>
    </>
  )
}

export default SettingsPage