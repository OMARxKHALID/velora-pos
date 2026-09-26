import { cookies } from "next/headers"
import { SidebarInset, SidebarProvider } from "@/shared/components/ui/sidebar"
import { AppSidebar } from "@/shared/components/layout/app-sidebar"
import { AppHeader } from "@/shared/components/layout/app-header"
import { requireRole } from "@/features/auth/server/session"
import { QueryProvider } from "@/shared/providers/query-provider"
import { LedgerStoreProvider } from "@/features/ledger/store/ledger-store-provider"
import { listShops } from "@/features/shops/server/shops"
import { directoryFor, listPeople, staffActivity } from "@/features/staff/server/staff"
import { getDb } from "@/server/db/client"
import { appEnv } from "@/config/env"

const DashboardLayout = async ({ children }) => {
  const user = await requireRole()
  const cookieStore = await cookies()
  const sidebarOpen = cookieStore.get("sidebar_state")?.value !== "false"
  const db = getDb()
  const directory = user.role === "admin" ? directoryFor(user, await listPeople(db), await staffActivity(db), await listShops(db)) : directoryFor(user, await listPeople(db))

  return (
    <QueryProvider>
    <LedgerStoreProvider user={user} directory={directory}>
      <SidebarProvider defaultOpen={sidebarOpen}>
        <AppSidebar user={user} sampleData={appEnv().SAMPLE_DATA} />
        <SidebarInset className="min-w-0">
          <AppHeader user={user} />
          <div data-slot="page-content" className="@container flex min-w-0 flex-1 flex-col gap-6 p-4 md:p-6">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </LedgerStoreProvider>
    </QueryProvider>
  )
}

export default DashboardLayout
