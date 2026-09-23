"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ArrowCounterClockwiseIcon, CaretUpDownIcon, CheckIcon, PlusIcon, SignOutIcon, StorefrontIcon } from "@phosphor-icons/react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { logout } from "@/features/auth/actions"
import { roleLabels } from "@/features/auth/lib/demo-users"
import { useShopScope } from "@/features/shops/hooks/use-shop-scope"
import { ALL_SHOPS, shopName, shops } from "@/features/shops/lib/shops"
import { useDemoStore } from "@/features/demo/store/demo-store-provider"
import { navItems } from "./nav-items"
import { ResetDemoDialog } from "./reset-demo-dialog"
import { ThemeToggle } from "./theme-toggle"
import { VeloraLogo } from "./velora-logo"

const initials = (name) => name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("")

const ShopSwitcher = ({ user }) => {
  const scope = useShopScope(user)
  const setShopScope = useDemoStore(({ setShopScope }) => setShopScope)
  const canSwitch = user.role === "admin"
  const options = [{ id: ALL_SHOPS, name: "All shops" }, ...shops]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={!canSwitch}
        render={<SidebarMenuButton size="lg" tooltip={shopName(scope)} className="border border-sidebar-border group-data-[collapsible=icon]:border-0" />}
      >
        <StorefrontIcon className="text-gold" />
        <span className="flex-1 truncate text-left text-sm font-semibold group-data-[collapsible=icon]:hidden">{shopName(scope)}</span>
        {canSwitch && <CaretUpDownIcon className="ml-auto group-data-[collapsible=icon]:hidden" />}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-60" align="start">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Show</DropdownMenuLabel>
          {options.map(({ id, name }) => (
            <DropdownMenuItem key={id} onClick={() => setShopScope(id)}>
              <StorefrontIcon />
              {name}
              {scope === id && <CheckIcon className="ml-auto text-gold" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export const AppSidebar = ({ user }) => {
  const pathname = usePathname()
  const items = navItems.filter(({ roles }) => roles.includes(user.role))
  const pendingRefunds = useDemoStore(({ refunds }) => refunds.filter(({ status }) => status === "pending").length)
  const badges = { "/refunds": pendingRefunds }

  const [resetOpen, setResetOpen] = useState(false)

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="gap-4 p-3 group-data-[collapsible=icon]:gap-2 group-data-[collapsible=icon]:px-2">
        <Link href="/" aria-label="Go to start page" className="px-1 pt-1 group-data-[collapsible=icon]:hidden">
          <VeloraLogo />
        </Link>
        <Link href="/" aria-label="Go to start page" className="hidden justify-center group-data-[collapsible=icon]:flex">
          <VeloraLogo compact />
        </Link>
        <SidebarMenu>
          <SidebarMenuItem>
            <ShopSwitcher user={user} />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map(({ href, label, icon: Icon }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton
                    isActive={pathname.startsWith(href)}
                    tooltip={label}
                    render={<Link href={href} />}
                  >
                    <Icon />
                    <span>{label}</span>
                  </SidebarMenuButton>
                  {badges[href] > 0 && <SidebarMenuBadge className="bg-warning text-warning-foreground">{badges[href]}</SidebarMenuBadge>}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="gap-3 p-3 group-data-[collapsible=icon]:px-2">
        <ThemeToggle />
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger render={<SidebarMenuButton size="lg" tooltip={user.name} />}>
                <Avatar className="size-8">
                  <AvatarFallback className="bg-accent text-xs font-semibold text-accent-foreground">
                    {initials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left leading-tight">
                  <span className="truncate text-sm font-semibold">{user.name}</span>
                  <span className="truncate text-xs text-muted-foreground">{user.title}</span>
                </div>
                <CaretUpDownIcon className="ml-auto" />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="min-w-56" side="top" align="start">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Signed in as {roleLabels[user.role]}</DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                {user.role === "admin" && (
                  <DropdownMenuItem onClick={() => setResetOpen(true)}>
                    <ArrowCounterClockwiseIcon />
                    Reset demo data
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem variant="destructive" onClick={() => logout()}>
                  <SignOutIcon />
                  Switch user
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
      {user.role === "admin" && <ResetDemoDialog open={resetOpen} onOpenChange={setResetOpen} />}
    </Sidebar>
  )
}
