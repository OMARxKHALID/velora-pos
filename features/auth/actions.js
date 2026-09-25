"use server"

import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { z } from "zod"
import { getDb } from "@/lib/db/client"
import { authEnv, pinSecret } from "@/lib/env"
import { homeFor } from "./lib/roles"
import { getAuth } from "./server/auth"
import { approveDiscount } from "./server/approvals"
import { clientAddress, createSignInAttempts } from "./server/sign-in-attempts"
import { actionResult, authorize } from "./server/session"

const signInSchema = z.object({
  username: z.string().trim().toLowerCase().min(1, { error: "Enter your username" }).max(30),
  password: z.string().min(1, { error: "Enter your password" }).max(128),
})

const TOO_MANY = "Too many attempts. Wait 15 minutes and try again."

const wrongPassword = (error) => error?.body?.code === "INVALID_USERNAME_OR_PASSWORD" || error?.statusCode === 401

const signInError = (error) => {
  if (error?.body?.code === "BANNED_USER") return error.body.message
  if (error?.status === "TOO_MANY_REQUESTS" || error?.statusCode === 429) return TOO_MANY
  if (wrongPassword(error)) return "Wrong username or password"
  console.error(error)
  return "Could not sign in. Try again."
}

export const signIn = async (_previous, formData) => {
  const parsed = signInSchema.safeParse({ username: formData.get("username"), password: formData.get("password") })
  if (!parsed.success) return { error: parsed.error.issues[0].message, username: String(formData.get("username") ?? "") }

  const requestHeaders = await headers()
  const attempt = { username: parsed.data.username, address: clientAddress(requestHeaders) }
  const attempts = createSignInAttempts(getDb())
  if (await attempts.blocked(attempt)) return { error: TOO_MANY, username: attempt.username }

  let role
  try {
    const result = await getAuth().api.signInUsername({ body: parsed.data, headers: requestHeaders })
    role = result.user.role
  } catch (error) {
    if (wrongPassword(error)) await attempts.fail(attempt)
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

export const approveDiscountAction = async (supervisorId, pin, discountPct) =>
  actionResult(async () => {
    const cashier = await authorize("cashier")
    return approveDiscount({ db: getDb(), pinSecret: pinSecret(), approvalSecret: authEnv().BETTER_AUTH_SECRET }, { cashierId: cashier.id, supervisorId, pin, discountPct })
  })
