import { cookies } from "next/headers"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { AppHeader } from "@/components/layout/app-header"
import { requireRole } from "@/features/auth/server/session"
import { QueryProvider } from "@/components/providers/query-provider"
import { LedgerStoreProvider } from "@/features/ledger/store/ledger-store-provider"
import { directoryFor, listPeople, staffActivity } from "@/features/staff/server/staff"
import { getDb } from "@/lib/db/client"
import { appEnv } from "@/lib/env"

const DashboardLayout = async ({ children }) => {
  const user = await requireRole()
  const cookieStore = await cookies()
  const sidebarOpen = cookieStore.get("sidebar_state")?.value !== "false"
  const db = getDb()
  const directory = directoryFor(user, await listPeople(db), user.role === "admin" ? await staffActivity(db) : {})

  return (
    <QueryProvider>
    <LedgerStoreProvider directory={directory}>
      <SidebarProvider defaultOpen={sidebarOpen}>
        <AppSidebar user={user} demoMode={appEnv().DEMO_MODE} />
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
