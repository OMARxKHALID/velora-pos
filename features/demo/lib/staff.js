import { SHOP_NAME, STAFF_ROLES } from "@/features/auth/lib/demo-users"
import { newId } from "@/lib/id"

export const initialStaff = {
  "u-admin": {
    id: "u-admin",
    name: "ASIF",
    role: "admin",
    email: "asif@velora.pk",
    phone: "0300 8412910",
    shop: "Head Office",
    joinedAt: "15 Jan 2024",
    avatar: "AS",
  },
  "u-manager": {
    id: "u-manager",
    name: "Bilal Ahmed",
    role: "manager",
    email: "bilal.ahmed@velora.pk",
    phone: "0321 4589201",
    shop: SHOP_NAME,
    joinedAt: "01 Jun 2024",
    avatar: "BA",
  },
  "u-cashier": {
    id: "u-cashier",
    name: "Hamza Ali",
    role: "cashier",
    email: "hamza.ali@velora.pk",
    phone: "0333 9128374",
    shop: SHOP_NAME,
    joinedAt: "10 Jan 2025",
    avatar: "HA",
  },
}

export const staffName = (id, staff = initialStaff) => staff?.[id]?.name ?? initialStaff[id]?.name ?? "Unknown"

export const activeStaff = (staff) => Object.values(staff ?? {}).filter((person) => !person.removed)

export const canApprove = (staff, id) => Boolean(staff?.[id]) && !staff[id].removed && staff[id].role !== "cashier"

export const canSell = (staff, id) => Boolean(staff?.[id]) && !staff[id].removed && staff[id].role === "cashier"

const initialsOf = (name) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("")

const slugOf = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "")

const LAST_SUPERVISOR = "Keep at least one supervisor so discounts and returns can still be approved."

const lastSupervisor = (staff, id) => staff[id]?.role === "manager" && activeStaff(staff).filter((person) => person.role === "manager").length <= 1

const guardPerson = (staff, id) => {
  const person = staff[id]
  if (!person || person.removed) throw new Error("This person is not on the team.")
  if (person.role === "admin") throw new Error("The owner account cannot be changed.")
  return person
}

export const applyAddStaff = (staff, { name, role, email, phone }, now = new Date()) => {
  if (!STAFF_ROLES.includes(role)) throw new Error("Choose Supervisor or Cashier.")
  const cleanName = name?.trim().replace(/\s+/g, " ")
  if (!cleanName) throw new Error("Enter a name.")

  const id = `u-${role}-${newId().slice(0, 8)}`
  const member = {
    id,
    name: cleanName,
    role,
    email: email?.trim() || `${slugOf(cleanName)}@velora.pk`,
    phone: phone?.trim() || "—",
    shop: SHOP_NAME,
    joinedAt: now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    avatar: initialsOf(cleanName),
  }
  return { staff: { ...staff, [id]: member }, member }
}

export const applyTransferRole = (staff, id, role) => {
  const person = guardPerson(staff, id)
  if (!STAFF_ROLES.includes(role)) throw new Error("Choose Supervisor or Cashier.")
  if (person.role === role) return staff
  if (lastSupervisor(staff, id)) throw new Error(LAST_SUPERVISOR)
  return { ...staff, [id]: { ...person, role } }
}

export const applyRemoveStaff = (staff, id) => {
  const person = guardPerson(staff, id)
  if (lastSupervisor(staff, id)) throw new Error(LAST_SUPERVISOR)
  return { ...staff, [id]: { ...person, removed: true } }
}
