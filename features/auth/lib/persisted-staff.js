import { STORAGE_KEY } from "@/features/demo/lib/storage"
import { USER_ID_PATTERN } from "./session-cookie"
import { isRole } from "./demo-users"

export const parsePersistedStaff = (raw) => {
  if (!raw) return null
  try {
    const saved = JSON.parse(raw)?.state?.staff
    if (!saved || typeof saved !== "object") return null
    const people = Object.values(saved).filter(
      (person) => person && USER_ID_PATTERN.test(person.id) && isRole(person.role) && typeof person.name === "string" && person.name.trim() && !person.removed
    )
    return people.length ? people : null
  } catch {
    return null
  }
}

export const readPersistedStaffRaw = () => {
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}
