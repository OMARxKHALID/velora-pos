import { PageHeader } from "@/components/layout/page-header"
import { getSupervisorPins, requireRole } from "@/features/auth/lib/session"
import { pinHolders } from "@/features/auth/lib/supervisor-pins"
import { DemoReady } from "@/features/demo/components/demo-ready"
import { SettingsScreen } from "@/features/settings/components/settings-screen"

const SettingsPage = async () => {
  await requireRole("admin")
  const holders = pinHolders(await getSupervisorPins())

  return (
    <>
      <PageHeader title="Settings" description="Tax, discounts and each supervisor's approval PIN." />
      <DemoReady>
        <SettingsScreen pinHolders={holders} />
      </DemoReady>
    </>
  )
}

export default SettingsPage