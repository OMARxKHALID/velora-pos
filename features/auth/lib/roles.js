import { SHOP_ID } from "@/features/catalog/lib/catalog"
import { GROUP_NAME, SHOP_NAME } from "@/features/shops/lib/constants"

export const ROLES = ["admin", "manager", "cashier"]
export const STAFF_ROLES = ["manager", "cashier"]

export const roleLabels = { admin: "Owner", manager: "Supervisor", cashier: "Cashier" }

export const roleBlurbs = {
  admin: "Watches sales, profit, stock and staff. Does not sell.",
  manager: "Runs the shop: approves returns, manages stock and catalog.",
  cashier: "Processes checkout and counts cash at closing.",
}

export const isRole = (role) => typeof role === "string" && ROLES.includes(role)

export const homeFor = (role) => (role === "admin" ? "/dashboard" : role === "manager" ? "/sales" : "/pos")

export const titleFor = (role) => `${roleLabels[role]} · ${role === "admin" ? GROUP_NAME : SHOP_NAME}`

export const toSessionUser = ({ id, name, role, shopIds }) => ({
  id,
  name,
  role,
  title: titleFor(role),
  shopId: role === "admin" ? null : (shopIds?.[0] ?? SHOP_ID),
})
