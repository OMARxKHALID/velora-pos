"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { demoUsers, homeFor } from "./lib/demo-users"
import { SESSION_COOKIE } from "./lib/session"

export const loginAs = async (role) => {
  if (!demoUsers[role]) return
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, role, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" })
  redirect(homeFor(role))
}

export const logout = async () => {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
  redirect("/")
}
