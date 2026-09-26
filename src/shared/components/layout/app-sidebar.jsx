"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { CaretUpDownIcon, CheckIcon, SignOutIcon, StorefrontIcon } from "@phosphor-icons/react"
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
} from "@/shared/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"
import { signOut } from "@/features/auth/actions"
import { forgetDevice } from "@/features/offline/lib/forget-device"
import { roleLabels } from "@/features/auth/lib/roles"
import { useShopNameOf, useShopScope } from "@/features/shops/hooks/use-shop-scope"
import { ALL_SHOPS, shopName } from "@/features/shops/lib/shops"
import { GROUP_NAME } from "@/features/shops/lib/constants"
import { useLedgerStore } from "@/features/ledger/store/ledger-store-provider"
import { StaffAvatar } from "@/features/staff/components/staff-avatar"
import { navItems } from "./nav-items"
import { ThemeToggle } from "./theme-toggle"
import { VeloraLogo } from "./velora-logo"

const UserTitle = ({ user }) => {
  const person = useLedgerStore(({ staff }) => staff[user.id])
  const shopOf = useShopNameOf()
  return user.role === "admin" ? `${roleLabels.admin} · ${GROUP_NAME}` : `${roleLabels[user.role]} · ${shopOf(person ?? user)}`
}

const SignedInAvatar = ({ user }) => {
  const person = useLedgerStore(({ staff }) => staff[user.id])
  return <StaffAvatar person={person ?? { name: user.name }} className="size-8" fallbackClassName="bg-accent text-xs font-semibold text-accent-foreground" />
}

const ShopSwitcher = ({ user }) => {
  const scope = useShopScope(user)
  const setShopScope = useLedgerStore(({ setShopScope }) => setShopScope)
  const shops = useLedgerStore(({ shops }) => shops)
  const canSwitch = user.role === "admin"
  const options = [{ id: ALL_SHOPS, name: "All shops" }, ...shops.filter(({ active }) => active !== false)]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={!canSwitch}
        render={<SidebarMenuButton size="lg" tooltip={shopName(scope, shops)} className="border border-sidebar-border group-data-[collapsible=icon]:border-0" />}
      >
        <StorefrontIcon className="text-gold" />
        <span className="flex-1 truncate text-left text-sm font-semibold group-data-[collapsible=icon]:hidden">{shopName(scope, shops)}</span>
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
  const scope = useShopScope(user)
  const pendingRefunds = useLedgerStore(({ refunds }) => refunds.filter(({ status, shopId }) => status === "pending" && (scope === ALL_SHOPS || shopId === scope)).length)
  const badges = { "/refunds": pendingRefunds }

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
                <SignedInAvatar user={user} />
                <div className="grid flex-1 text-left leading-tight">
                  <span className="truncate text-sm font-semibold">{user.name}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    <UserTitle user={user} />
                  </span>
                </div>
                <CaretUpDownIcon className="ml-auto" />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="min-w-56" side="top" align="start">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Signed in as {roleLabels[user.role]}</DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => forgetDevice().finally(() => signOut())}>
                  <SignOutIcon />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
