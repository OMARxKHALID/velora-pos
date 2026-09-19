import "server-only"
import { cache } from "react"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { demoUsers } from "./demo-users"

export const SESSION_COOKIE = "velora_demo_role"

export const getSession = cache(async () => {
  const cookieStore = await cookies()
  return demoUsers[cookieStore.get(SESSION_COOKIE)?.value] ?? null
})

export const requireRole = async (...roles) => {
  const user = await getSession()
  if (!user) redirect("/")
  if (roles.length && !roles.includes(user.role)) redirect("/")
  return user
}
