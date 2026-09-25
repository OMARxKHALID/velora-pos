import { STAFF_ROLES } from "@/features/auth/lib/demo-users"
import { SHOP_ID } from "@/features/catalog/lib/catalog"
import { staffShopId } from "@/features/shops/lib/shops"
import { newId } from "@/lib/id"

export const initialStaff = {
  "u-admin": {
    id: "u-admin",
    name: "ASIF",
    role: "admin",
    email: "asif@velora.pk",
    phone: "0300 8412910",
    shopId: null,
    joinedAt: "15 Jan 2024",
    avatar: "AS",
  },
  "u-manager": {
    id: "u-manager",
    name: "Bilal Ahmed",
    role: "manager",
    email: "bilal.ahmed@velora.pk",
    phone: "0321 4589201",
    shopId: SHOP_ID,
    joinedAt: "01 Jun 2024",
    avatar: "BA",
  },
  "u-cashier": {
    id: "u-cashier",
    name: "Hamza Ali",
    role: "cashier",
    email: "hamza.ali@velora.pk",
    phone: "0333 9128374",
    shopId: SHOP_ID,
    joinedAt: "10 Jan 2025",
    avatar: "HA",
  },
}

export const staffName = (id, staff = initialStaff) => staff?.[id]?.name ?? initialStaff[id]?.name ?? "Unknown"

export const activeStaff = (staff) => Object.values(staff ?? {}).filter((person) => !person.removed)

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export const localDate = (at = Date.now()) => {
  const date = new Date(at)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

export const isOnLeave = (person, today = localDate()) => Boolean(person?.leave) && person.leave.from <= today && (!person.leave.until || today <= person.leave.until)

export const isAvailable = (person, today) => Boolean(person) && !person.removed && !isOnLeave(person, today)

export const canApprove = (staff, id, today) => isAvailable(staff?.[id], today) && staff[id].role !== "cashier"

export const worksAtClosedShop = (person, shops) => Boolean(shops?.some(({ id, active }) => active === false && id === staffShopId(person)))

export const approverFor = (staff, today, shopId = null) => {
  const available = activeStaff(staff).filter((person) => isAvailable(person, today))
  return available.find((person) => person.role === "manager" && (!shopId || staffShopId(person) === shopId)) ?? available.find((person) => person.role === "admin") ?? null
}

const initialsOf = (name) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("")

const slugOf = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "")

const CNIC_PATTERN = /^(\d{5})-?(\d{7})-?(\d)$/
const PHONE_PATTERN = /^(?:\+92|0)(3\d{2})[\s-]?(\d{7})$/
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_PHOTO_LENGTH = 200000

const trimmed = (value, max) => (typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, max) : "")

export const formatCnic = (value) => {
  const match = trimmed(value, 20).match(CNIC_PATTERN)
  return match ? `${match[1]}-${match[2]}-${match[3]}` : null
}

export const formatPhone = (value) => {
  const match = trimmed(value, 20).replace(/\s+/g, "").match(PHONE_PATTERN)
  return match ? `0${match[1]} ${match[2]}` : null
}

export const cleanProfile = ({ name, email, phone, cnic, address, city, emergencyContact, photo } = {}) => {
  const cleanName = trimmed(name, 80)
  if (!cleanName) throw new Error("Enter a name.")
  const profile = { name: cleanName, address: trimmed(address, 160), city: trimmed(city, 40) }

  const cleanEmail = trimmed(email, 80)
  if (cleanEmail && !EMAIL_PATTERN.test(cleanEmail)) throw new Error("That email address does not look right.")
  profile.email = cleanEmail

  for (const [key, value, label] of [
    ["phone", phone, "Phone"],
    ["emergencyContact", emergencyContact, "Emergency contact"],
  ]) {
    const raw = trimmed(value, 20).replace(/^—$/, "")
    const formatted = raw ? formatPhone(raw) : ""
    if (formatted === null) throw new Error(`${label} must be a Pakistani mobile number like 0300 1234567.`)
    profile[key] = formatted
  }

  const rawCnic = trimmed(cnic, 20)
  const formattedCnic = rawCnic ? formatCnic(rawCnic) : ""
  if (formattedCnic === null) throw new Error("CNIC must be 13 digits, like 35202-1234567-1.")
  profile.cnic = formattedCnic

  if (photo && (typeof photo !== "string" || !photo.startsWith("data:image/") || photo.length > MAX_PHOTO_LENGTH)) throw new Error("That photo cannot be used. Try a smaller image.")
  profile.photo = photo || null

  return profile
}

const LAST_SUPERVISOR = "Keep at least one supervisor so discounts and returns can still be approved."

const lastSupervisor = (staff, id) => staff[id]?.role === "manager" && activeStaff(staff).filter((person) => person.role === "manager").length <= 1

const guardPerson = (staff, id) => {
  const person = staff[id]
  if (!person || person.removed) throw new Error("This person is not on the team.")
  if (person.role === "admin") throw new Error("The owner account cannot be changed.")
  return person
}

export const applyAddStaff = (staff, { role, shopId = SHOP_ID, ...input }, now = new Date()) => {
  if (!STAFF_ROLES.includes(role)) throw new Error("Choose Supervisor or Cashier.")
  const profile = cleanProfile(input)

  const id = `u-${role}-${newId().slice(0, 8)}`
  const member = {
    id,
    role,
    ...profile,
    email: profile.email || `${slugOf(profile.name)}@velora.pk`,
    shopId,
    joinedAt: now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    avatar: initialsOf(profile.name),
  }
  return { staff: { ...staff, [id]: member }, member }
}

export const applyUpdateProfile = (staff, id, input) => {
  const person = staff[id]
  if (!person || person.removed) throw new Error("This person is not on the team.")
  const profile = cleanProfile({ ...person, ...input })
  const shopId = person.role === "admin" ? null : (input.shopId ?? person.shopId ?? SHOP_ID)
  return { ...staff, [id]: { ...person, ...profile, shopId, avatar: initialsOf(profile.name) } }
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

export const applySetLeave = (staff, id, leave) => {
  const person = guardPerson(staff, id)
  if (!leave) return { ...staff, [id]: { ...person, leave: null } }
  const { from, until = "", note = "" } = leave
  if (!DATE_PATTERN.test(from ?? "")) throw new Error("Pick the first day of leave.")
  if (until && (!DATE_PATTERN.test(until) || until < from)) throw new Error("The last day must be on or after the first day.")
  return { ...staff, [id]: { ...person, leave: { from, until: until || null, note: note.trim().slice(0, 120) } } }
}
