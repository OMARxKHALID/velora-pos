import { SHOP_NAME } from "@/features/shops/lib/constants"

export const initialStaff = {
  "u-admin": { id: "u-admin", name: "ASIF", role: "admin", username: "asif", email: "asif@velora.pk", phone: "0300 8412910", shop: "Head Office", joinedAt: "2024-01-15T09:00:00.000Z", avatar: "AS" },
  "u-manager": { id: "u-manager", name: "Bilal Ahmed", role: "manager", username: "bilal", email: "bilal.ahmed@velora.pk", phone: "0321 4589201", shop: SHOP_NAME, joinedAt: "2024-06-01T09:00:00.000Z", avatar: "BA" },
  "u-cashier": { id: "u-cashier", name: "Hamza Ali", role: "cashier", username: "hamza", email: "hamza.ali@velora.pk", phone: "0333 9128374", shop: SHOP_NAME, joinedAt: "2025-01-10T09:00:00.000Z", avatar: "HA" },
}

export const DEMO_MANAGER_PIN = "1234"

export const staffName = (id, staff = initialStaff) => staff?.[id]?.name ?? initialStaff[id]?.name ?? "Unknown"

export const activeStaff = (staff) => Object.values(staff ?? {}).filter((person) => !person.removed)

const usable = (staff, id) => Boolean(staff?.[id]) && !staff[id].removed && !staff[id].disabled

export const canApprove = (staff, id) => usable(staff, id) && staff[id].role !== "cashier"

export const canSell = (staff, id) => usable(staff, id) && staff[id].role === "cashier"

export const supervisorsOf = (staff) => activeStaff(staff).filter(({ role, disabled }) => role === "manager" && !disabled)
