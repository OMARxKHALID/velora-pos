import { PageHeader } from "@/shared/components/layout/page-header"
import { requireRole } from "@/features/auth/server/session"
import { LedgerReady } from "@/features/ledger/components/ledger-ready"
import { SettingsScreen } from "@/features/settings/components/settings-screen"
import { appEnv } from "@/config/env"

export const metadata = { title: "Settings" }

const SettingsPage = async () => {
  const user = await requireRole("admin")

  return (
    <>
      <PageHeader title="Settings" description="Shops, counters, tax, payments, discounts and receipts." />
      <LedgerReady skeleton="panels">
        <SettingsScreen user={user} sampleData={appEnv().SAMPLE_DATA} />
      </LedgerReady>
    </>
  )
}

export default SettingsPage
