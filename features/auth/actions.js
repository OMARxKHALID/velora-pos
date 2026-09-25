"use server"

import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"
import { homeFor } from "./lib/demo-users"
import { USER_ID_PATTERN, cleanIdentity, encodeSession, serializeDisabled } from "./lib/session-cookie"
import { DISABLED_COOKIE, PINS_COOKIE, SESSION_COOKIE, getDisabledStaff, getSupervisorPins, requireRole } from "./lib/session"
import { createAttemptLimiter } from "./lib/pin-attempts"
import { PIN_PATTERN, checkPin, hashPin, hasPin, pinHolders, serializePins } from "./lib/supervisor-pins"

const pinAttempts = createAttemptLimiter()

const cookieOptions = async () => ({
  httpOnly: true,
  sameSite: "lax",
  secure: (await headers()).get("x-forwarded-proto") === "https",
  path: "/",
})

export const signIn = async (formData) => {
  const identity = cleanIdentity({ id: formData.get("id"), name: formData.get("name"), role: formData.get("role") })
  if (!identity) redirect("/")
  if ((await getDisabledStaff()).includes(identity.id)) redirect("/?blocked=1")
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, encodeSession(identity), await cookieOptions())
  redirect(homeFor(identity.role))
}

export const logout = async () => {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
  redirect("/")
}

export const setStaffAccess = async (userId, enabled) => {
  const owner = await requireRole("admin")
  if (typeof userId !== "string" || !USER_ID_PATTERN.test(userId) || userId === owner.id) {
    return { error: "This person's access cannot be changed" }
  }
  const disabled = new Set(await getDisabledStaff())
  if (enabled) disabled.delete(userId)
  else disabled.add(userId)
  const cookieStore = await cookies()
  cookieStore.set(DISABLED_COOKIE, serializeDisabled([...disabled]), await cookieOptions())
  return { disabled: [...disabled] }
}

export const resetStaffAccess = async () => {
  await requireRole("admin")
  const cookieStore = await cookies()
  cookieStore.delete(DISABLED_COOKIE)
  cookieStore.delete(PINS_COOKIE)
}

export const verifySupervisorPin = async (supervisorId, pin) => {
  await requireRole()
  if (typeof supervisorId !== "string" || !USER_ID_PATTERN.test(supervisorId)) return { error: "Choose a supervisor" }
  if (typeof pin !== "string" || !PIN_PATTERN.test(pin)) return { error: "Enter the 4-digit supervisor PIN" }
  if (pinAttempts.blocked(supervisorId)) return { error: "Too many wrong PINs. Try again in a few minutes." }
  const pins = await getSupervisorPins()
  if (!hasPin(pins, supervisorId)) return { error: "This supervisor has no PIN yet. The owner can set one in Settings." }
  if (!checkPin(pins, supervisorId, pin)) {
    pinAttempts.fail(supervisorId)
    return { error: "Wrong PIN" }
  }
  pinAttempts.clear(supervisorId)
  return { ok: true }
}

export const setSupervisorPin = async (supervisorId, pin) => {
  await requireRole("admin")
  if (typeof supervisorId !== "string" || !USER_ID_PATTERN.test(supervisorId)) return { error: "Choose a supervisor" }
  if (typeof pin !== "string" || !PIN_PATTERN.test(pin)) return { error: "The PIN must be 4 digits" }
  const pins = { ...(await getSupervisorPins()), [supervisorId]: hashPin(supervisorId, pin) }
  const cookieStore = await cookies()
  cookieStore.set(PINS_COOKIE, serializePins(pins), { ...(await cookieOptions()), maxAge: 60 * 60 * 24 * 365 })
  pinAttempts.clear(supervisorId)
  return { ok: true, pinHolders: pinHolders(pins) }
}
