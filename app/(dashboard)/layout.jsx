import { cookies } from "next/headers"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { AppHeader } from "@/components/layout/app-header"
import { requireRole } from "@/features/auth/lib/session"
import { DemoStoreProvider } from "@/features/demo/store/demo-store-provider"

const DashboardLayout = async ({ children }) => {
  const user = await requireRole()
  const cookieStore = await cookies()
  const sidebarOpen = cookieStore.get("sidebar_state")?.value !== "false"

  return (
    <DemoStoreProvider user={user}>
      <SidebarProvider defaultOpen={sidebarOpen}>
        <AppSidebar user={user} />
        <SidebarInset className="min-w-0">
          <AppHeader user={user} />
          <div data-slot="page-content" className="@container flex min-w-0 flex-1 flex-col gap-6 p-4 md:p-6">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </DemoStoreProvider>
  )
}

export default DashboardLayout
