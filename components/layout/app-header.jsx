"use client"

import { usePathname } from "next/navigation"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { useShopScope } from "@/features/shops/hooks/use-shop-scope"
import { shopName } from "@/features/shops/lib/shops"
import { useDemoStore } from "@/features/demo/store/demo-store-provider"
import { ConnectionStatus } from "./connection-status"
import { titleFor } from "./nav-items"

const today = new Intl.DateTimeFormat("en-PK", { weekday: "short", day: "numeric", month: "short", year: "numeric" })

export const AppHeader = ({ user }) => {
  const pathname = usePathname()
  const scope = useShopScope(user)
  const shops = useDemoStore(({ shops }) => shops)

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur">
      <SidebarTrigger />
      <Separator orientation="vertical" className="data-vertical:h-5 data-vertical:self-center" />
      <nav className="flex min-w-0 items-center gap-2 text-sm">
        <span className="hidden text-muted-foreground sm:inline">{shopName(shops, scope)}</span>
        <span className="hidden text-muted-foreground sm:inline">/</span>
        <span className="truncate font-medium text-gold">{titleFor(pathname)}</span>
      </nav>
      <div className="ml-auto flex items-center gap-4 text-xs">
        <span className="hidden text-muted-foreground sm:inline" suppressHydrationWarning>
          {today.format(new Date())}
        </span>
        <ConnectionStatus />
      </div>
    </header>
  )
}
