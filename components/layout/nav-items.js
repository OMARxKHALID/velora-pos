import {
  ArrowUUpLeftIcon,
  CashRegisterIcon,
  ChartLineUpIcon,
  ClockCounterClockwiseIcon,
  GearSixIcon,
  PackageIcon,
  ReceiptIcon,
  TagIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react"

export const navItems = [
  { href: "/dashboard", label: "Overview", icon: ChartLineUpIcon, roles: ["admin"] },
  { href: "/pos", label: "Sell", icon: CashRegisterIcon, roles: ["manager", "cashier"] },
  { href: "/sales", label: "Sales", icon: ReceiptIcon, roles: ["admin", "manager", "cashier"] },
  { href: "/refunds", label: "Returns", icon: ArrowUUpLeftIcon, roles: ["manager"] },
  { href: "/products", label: "Products", icon: TagIcon, roles: ["manager"] },
  { href: "/stock", label: "Stock", icon: PackageIcon, roles: ["admin", "manager"] },
  { href: "/movements", label: "Stock history", icon: ClockCounterClockwiseIcon, roles: ["admin", "manager"] },
  { href: "/staff", label: "Staff", icon: UsersThreeIcon, roles: ["admin"] },
  { href: "/settings", label: "Settings", icon: GearSixIcon, roles: ["admin", "manager"] },
]

export const titleFor = (pathname) => navItems.find(({ href }) => pathname.startsWith(href))?.label ?? ""
