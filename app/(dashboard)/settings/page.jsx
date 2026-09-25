import { PageHeader } from "@/components/layout/page-header"
import { requireRole } from "@/features/auth/server/session"
import { DemoReady } from "@/features/demo/components/demo-ready"
import { SettingsScreen } from "@/features/settings/components/settings-screen"
import { appEnv } from "@/lib/env"

const SettingsPage = async () => {
  await requireRole("admin")

  return (
    <>
      <PageHeader title="Settings" description="Tax, discounts and each supervisor's approval PIN." />
      <DemoReady>
        <SettingsScreen demoMode={appEnv().DEMO_MODE} />
      </DemoReady>
    </>
  )
}

export default SettingsPage
