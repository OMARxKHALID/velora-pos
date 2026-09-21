import "server-only"
import { cache } from "react"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { decodeSession, parseDisabled } from "./session-cookie"

export const SESSION_COOKIE = "velora_demo_session"
export const DISABLED_COOKIE = "velora_disabled_staff"

export const getDisabledStaff = cache(async () => {
  const cookieStore = await cookies()
  return parseDisabled(cookieStore.get(DISABLED_COOKIE)?.value)
})

export const getSession = cache(async () => {
  const cookieStore = await cookies()
  const user = decodeSession(cookieStore.get(SESSION_COOKIE)?.value)
  if (!user) return null
  const disabled = await getDisabledStaff()
  return disabled.includes(user.id) ? null : user
})

export const requireRole = async (...roles) => {
  const user = await getSession()
  if (!user) redirect("/")
  if (roles.length && !roles.includes(user.role)) redirect("/")
  return user
}
