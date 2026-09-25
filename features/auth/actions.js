"use server"

import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { z } from "zod"
import { getDb } from "@/lib/db/client"
import { authEnv } from "@/lib/env"
import { homeFor } from "./lib/roles"
import { getAuth } from "./server/auth"
import { approveDiscount } from "./server/approvals"
import { actionResult, authorize, pinSecret } from "./server/session"

const signInSchema = z.object({
  username: z.string().trim().toLowerCase().min(1, { error: "Enter your username" }).max(30),
  password: z.string().min(1, { error: "Enter your password" }).max(128),
})

const signInError = (error) => {
  const code = error?.body?.code
  if (code === "BANNED_USER") return error.body.message
  if (error?.status === "TOO_MANY_REQUESTS" || error?.statusCode === 429) return "Too many attempts. Wait a minute and try again."
  if (code === "INVALID_USERNAME_OR_PASSWORD" || error?.statusCode === 401) return "Wrong username or password"
  console.error(error)
  return "Could not sign in. Try again."
}

export const signIn = async (_previous, formData) => {
  const parsed = signInSchema.safeParse({ username: formData.get("username"), password: formData.get("password") })
  if (!parsed.success) return { error: parsed.error.issues[0].message, username: String(formData.get("username") ?? "") }

  let role
  try {
    const requestHeaders = await headers()
    const result = await getAuth().api.signInUsername({ body: parsed.data, headers: requestHeaders })
    role = result.user.role
  } catch (error) {
    return { error: signInError(error), username: parsed.data.username }
  }
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
