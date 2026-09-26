import "server-only"
import { cache } from "react"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { blockedReason } from "@/features/staff/server/access"
import { getDb, getMongoClient } from "@/server/db/client"
import { bumpLedger } from "@/server/db/ledger-version"
import { authEnv } from "@/config/env"
import { AccessDenied } from "@/shared/lib/errors"
import { toSessionUser } from "../lib/roles"
import { getAuth } from "./auth"

export const getSession = cache(async () => {
  const requestHeaders = await headers()
  const session = await getAuth().api.getSession({ headers: requestHeaders })
  if (!session?.user || session.user.banned || session.user.removedAt) return null
  if (await blockedReason(getDb(), session.user)) return null
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

export const recordAction = (roles, work) =>
  actionResult(async () => {
    const user = await authorize(...roles)
    const db = getDb()
    const record = await work({ db, client: getMongoClient(), user, shopId: user.shopId, approvalSecret: authEnv().BETTER_AUTH_SECRET })
    await bumpLedger(db, user.shopId).catch((error) => console.error(error))
    return { record }
  })
