import { PageHeader } from "@/components/layout/page-header"
import { requireRole } from "@/features/auth/server/session"
import { LedgerReady } from "@/features/ledger/components/ledger-ready"
import { SettingsScreen } from "@/features/settings/components/settings-screen"
import { appEnv } from "@/lib/env"

const SettingsPage = async () => {
  await requireRole("admin")

  return (
    <>
      <PageHeader title="Settings" description="Tax, discounts and each supervisor's approval PIN." />
      <LedgerReady>
        <SettingsScreen sampleData={appEnv().SAMPLE_DATA} />
      </LedgerReady>
    </>
  )
}

export default SettingsPage
