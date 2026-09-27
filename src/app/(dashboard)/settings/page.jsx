import { PageHeader } from "@/shared/components/layout/page-header"
import { requireRole } from "@/features/auth/server/session"
import { SettingsSkeleton } from "@/shared/components/ui/table-skeleton"
import { LedgerReady } from "@/features/ledger/components/ledger-ready"
import { SettingsScreen } from "@/features/settings/components/settings-screen"

export const metadata = { title: "Settings" }

const SettingsPage = async () => {
  const user = await requireRole("admin")

  return (
    <>
      <PageHeader title="Settings" description="Shops, counters, tax, payments, discounts and receipts." />
      <LedgerReady fallback={<SettingsSkeleton />}>
        <SettingsScreen user={user} />
      </LedgerReady>
    </>
  )
}

export default SettingsPage
