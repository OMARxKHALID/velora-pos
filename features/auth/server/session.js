import "server-only"
import { cache } from "react"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { toSessionUser } from "../lib/roles"
import { getAuth } from "./auth"
import { AccessDenied } from "./session-errors"

export { AccessDenied, UserError } from "./session-errors"

export { pinSecret } from "@/lib/env"

export const getSession = cache(async () => {
  const requestHeaders = await headers()
  const session = await getAuth().api.getSession({ headers: requestHeaders })
  if (!session?.user || session.user.banned || session.user.removedAt) return null
  return toSessionUser(session.user)
})

export const requireRole = async (...roles) => {
  const user = await getSession()
  if (!user) redirect("/")
  if (roles.length && !roles.includes(user.role)) redirect("/")
  return user
}

export const authorize = async (...roles) => {
  const user = await getSession()
  if (!user) throw new AccessDenied("Your session has ended. Sign in again.")
  if (roles.length && !roles.includes(user.role)) throw new AccessDenied("You are not allowed to do that.")
  return user
}

export const actionResult = async (work) => {
  try {
    return { ok: true, ...(await work()) }
  } catch (error) {
    if (error?.expose) return { error: error.message }
    if (error?.body?.message) return { error: error.body.message }
    console.error(error)
    return { error: "Something went wrong. Try again." }
  }
}
