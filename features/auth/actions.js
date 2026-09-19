"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { staff } from "@/features/demo/lib/staff"
import { demoUsers, homeFor } from "./lib/demo-users"
import { DISABLED_COOKIE, SESSION_COOKIE, getDisabledStaff, requireRole } from "./lib/session"

const cookieOptions = { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" }

export const loginAs = async (role) => {
  const user = demoUsers[role]
  if (!user) return
  if ((await getDisabledStaff()).includes(user.id)) redirect("/?blocked=1")
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, role, cookieOptions)
  redirect(homeFor(role))
}

export const logout = async () => {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
  redirect("/")
}

export const setStaffAccess = async (userId, enabled) => {
  await requireRole("admin")
  if (!staff[userId] || staff[userId].role === "admin") return { error: "This person's access cannot be changed" }
  const disabled = new Set(await getDisabledStaff())
  if (enabled) disabled.delete(userId)
  else disabled.add(userId)
  const cookieStore = await cookies()
  cookieStore.set(DISABLED_COOKIE, [...disabled].join(","), cookieOptions)
  return { disabled: [...disabled] }
}
