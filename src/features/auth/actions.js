"use server"

import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { z } from "zod"
import { COLLECTIONS as C } from "@/server/db/collections"
import { getDb } from "@/server/db/client"
import { appEnv, authEnv, pinSecret } from "@/config/env"
import { homeFor } from "./lib/roles"
import { blockedReason } from "@/features/staff/server/access"
import { getAuth } from "./server/auth"
import { approveDiscard, approveDiscount } from "./server/approvals"
import { clientAddress, createSignInAttempts } from "./server/sign-in-attempts"
import { actionResult, authorize } from "./server/session"

const signInSchema = z.object({
  username: z.string().trim().toLowerCase().min(1, { error: "Enter your username or email" }).max(80),
  password: z.string().min(1, { error: "Enter your password" }).max(128),
})

const TOO_MANY = "Too many attempts. Wait 15 minutes and try again."

const wrongPassword = (error) => ["INVALID_USERNAME_OR_PASSWORD", "INVALID_EMAIL_OR_PASSWORD"].includes(error?.body?.code) || error?.statusCode === 401

const signInWith = (auth, { username, password }, headers) =>
  username.includes("@") ? auth.api.signInEmail({ body: { email: username, password }, headers }) : auth.api.signInUsername({ body: { username, password }, headers })

const signInError = (error) => {
  if (error?.body?.code === "BANNED_USER") return error.body.message
  if (error?.status === "TOO_MANY_REQUESTS" || error?.statusCode === 429) return TOO_MANY
  if (wrongPassword(error)) return "Wrong username, email or password"
  console.error(error)
  return "Could not sign in. Try again."
}

export const signIn = async (_previous, formData) => {
  const parsed = signInSchema.safeParse({ username: formData.get("username"), password: formData.get("password") })
  if (!parsed.success) return { error: parsed.error.issues[0].message, username: String(formData.get("username") ?? "") }

  const requestHeaders = await headers()
  const attempt = { username: parsed.data.username, address: clientAddress(requestHeaders, appEnv().CLIENT_IP_HEADER) }
  const attempts = createSignInAttempts(getDb())
  const claim = await attempts.claim(attempt)
  if (!claim) return { error: TOO_MANY, username: attempt.username }

  let role
  try {
    const result = await signInWith(getAuth(), parsed.data, requestHeaders)
    const blocked = await blockedReason(getDb(), result.user)
    if (blocked) {
      await getDb().collection(C.sessions).deleteMany({ token: result.token })
      await attempts.release(claim)
      return { error: blocked, username: attempt.username }
    }
    role = result.user.role
  } catch (error) {
    if (!wrongPassword(error)) await attempts.release(claim)
    return { error: signInError(error), username: attempt.username }
  }
  await attempts.clear(attempt.username)
  redirect(homeFor(role))
}

export const signOut = async () => {
  const requestHeaders = await headers()
  await getAuth()
    .api.signOut({ headers: requestHeaders })
    .catch(() => null)
  redirect("/")
}

const asCashier = (work) =>
  actionResult(async () => {
    const cashier = await authorize("cashier")
    return work({ db: getDb(), pinSecret: pinSecret(), approvalSecret: authEnv().BETTER_AUTH_SECRET }, { cashierId: cashier.id, shopId: cashier.shopId })
  })

export const approveDiscountAction = async (supervisorId, pin, discountPct, subtotal) =>
  asCashier((deps, cashier) => approveDiscount(deps, { ...cashier, supervisorId, pin, discountPct, subtotal }))

export const approveDiscardAction = async (supervisorId, pin, clientId) => asCashier((deps, cashier) => approveDiscard(deps, { ...cashier, supervisorId, pin, clientId }))
