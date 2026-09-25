export const staffName = (id, staff) => staff?.[id]?.name ?? "Unknown"

export const activeStaff = (staff) => Object.values(staff ?? {}).filter((person) => !person.removed)

export const supervisorsOf = (staff) => activeStaff(staff).filter(({ role, disabled }) => role === "manager" && !disabled)

export const approversOf = (staff, shopId, today) => supervisorsOf(staff).filter((person) => person.shopId === shopId && !isOnLeave(person, today))

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const CNIC_PATTERN = /^(\d{5})-?(\d{7})-?(\d)$/
const PHONE_PATTERN = /^(?:\+92|0)(3\d{2})[\s-]?(\d{7})$/
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_PHOTO_LENGTH = 200000

const trimmed = (value, max) => (typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, max) : "")

export const localDate = (at = Date.now()) => {
  const date = new Date(at)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

export const isOnLeave = (person, today = localDate()) => Boolean(person?.leave) && person.leave.from <= today && (!person.leave.until || today <= person.leave.until)

export const worksAtClosedShop = (person, shops) => Boolean(person?.shopId && shops?.some(({ id, active }) => active === false && id === person.shopId))

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
    const raw = trimmed(value, 20)
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

export const cleanLeave = (leave) => {
  if (!leave) return null
  const { from, until = "", note = "" } = leave
  if (!DATE_PATTERN.test(from ?? "")) throw new Error("Pick the first day of leave.")
  if (until && (!DATE_PATTERN.test(until) || until < from)) throw new Error("The last day must be on or after the first day.")
  return { from, until: until || null, note: String(note).trim().slice(0, 120) }
}
