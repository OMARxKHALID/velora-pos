"use server"

import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"
import { homeFor } from "./lib/demo-users"
import { USER_ID_PATTERN, cleanIdentity, encodeSession, serializeDisabled } from "./lib/session-cookie"
import { DISABLED_COOKIE, SESSION_COOKIE, getDisabledStaff, getSession, requireRole } from "./lib/session"

// Secure cookies are only accepted over https. Follow the actual protocol so the demo also signs in
// on http://localhost and over a local network, while production behind https stays secure.
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

// "Reset demo data" also turns everyone's access back on.
export const resetStaffAccess = async () => {
  if (!(await getSession())) return
  const cookieStore = await cookies()
  cookieStore.delete(DISABLED_COOKIE)
}
