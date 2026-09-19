import {
  ArrowUUpLeftIcon,
  CashRegisterIcon,
  ClockCounterClockwiseIcon,
  PackageIcon,
  ReceiptIcon,
  SquaresFourIcon,
  TagIcon,
} from "@phosphor-icons/react"

export const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: SquaresFourIcon, roles: ["admin", "manager"] },
  { href: "/pos", label: "Point of Sale", icon: CashRegisterIcon, roles: ["admin", "manager", "cashier"] },
  { href: "/sales", label: "Sales", icon: ReceiptIcon, roles: ["admin", "manager", "cashier"] },
  { href: "/refunds", label: "Refunds", icon: ArrowUUpLeftIcon, roles: ["admin", "manager"] },
  { href: "/products", label: "Products", icon: TagIcon, roles: ["admin", "manager"] },
  { href: "/stock", label: "Stock", icon: PackageIcon, roles: ["admin", "manager"] },
  { href: "/movements", label: "Stock Movements", icon: ClockCounterClockwiseIcon, roles: ["admin", "manager"] },
]

export const titleFor = (pathname) =>
  navItems.find(({ href }) => pathname.startsWith(href))?.label ?? ""
