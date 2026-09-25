import { STAFF_ROLES } from "@/features/auth/lib/roles"

export const LAST_SUPERVISOR = "Keep at least one supervisor so discounts and returns can still be approved."

const activeSupervisors = (people) => people.filter(({ role, removedAt }) => role === "manager" && !removedAt)

export const checkStaffChange = (people, id, { role } = {}) => {
  const person = people.find((entry) => entry.id === id)
  if (!person || person.removedAt) return "This person is not on the team."
  if (person.role === "admin") return "The owner account cannot be changed."
  if (role !== undefined && !STAFF_ROLES.includes(role)) return "Choose Supervisor or Cashier."
  const leavesSupervisors = role === undefined || role !== "manager"
  if (person.role === "manager" && leavesSupervisors && activeSupervisors(people).length <= 1) return LAST_SUPERVISOR
  return null
}

export const initialsOf = (name) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("")

export const USERNAME_PATTERN = /^[a-z0-9._-]{3,30}$/
