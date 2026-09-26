import { cookies } from "next/headers"
import { SidebarInset, SidebarProvider } from "@/shared/components/ui/sidebar"
import { AppSidebar } from "@/shared/components/layout/app-sidebar"
import { AppHeader } from "@/shared/components/layout/app-header"
import { requireRole } from "@/features/auth/server/session"
import { QueryProvider } from "@/shared/providers/query-provider"
import { LedgerStoreProvider } from "@/features/ledger/store/ledger-store-provider"
import { listShops } from "@/features/shops/server/shops"
import { directoryFor, listPeople, recentStaffActivity } from "@/features/staff/server/staff"
import { getDb } from "@/server/db/client"

const loadDirectory = async (user) => {
  const db = getDb()
  if (user.role !== "admin") return directoryFor(user, await listPeople(db))
  const [people, activity, shops] = await Promise.all([listPeople(db), recentStaffActivity(), listShops(db)])
  return directoryFor(user, people, activity, shops)
}

const DashboardLayout = async ({ children }) => {
  const [user, cookieStore] = await Promise.all([requireRole(), cookies()])
  const sidebarOpen = cookieStore.get("sidebar_state")?.value !== "false"
  const directory = await loadDirectory(user)

  return (
    <QueryProvider>
    <LedgerStoreProvider user={user} directory={directory}>
      <SidebarProvider defaultOpen={sidebarOpen}>
        <AppSidebar user={user} />
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
