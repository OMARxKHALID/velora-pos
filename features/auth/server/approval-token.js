import { createHmac, timingSafeEqual } from "node:crypto"

export const APPROVAL_TTL_MS = 5 * 60 * 1000

const keyFor = (secret) => createHmac("sha256", secret).update("velora:discount-approval").digest()

const sign = (secret, body) => createHmac("sha256", keyFor(secret)).update(body).digest("base64url")

export const issueApproval = (secret, { cashierId, supervisorId, discountPct, now = Date.now() }) => {
  const body = Buffer.from(JSON.stringify({ c: cashierId, s: supervisorId, p: discountPct, e: now + APPROVAL_TTL_MS })).toString("base64url")
  return `${body}.${sign(secret, body)}`
}

export const readApproval = (secret, token, { cashierId, discountPct, now = Date.now() }) => {
  const [body, signature] = typeof token === "string" ? token.split(".") : []
  if (!body || !signature) return null
  const expected = Buffer.from(sign(secret, body))
  const given = Buffer.from(signature)
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null
  try {
    const { c, s, p, e } = JSON.parse(Buffer.from(body, "base64url").toString("utf8"))
    if (c !== cashierId || p !== discountPct || typeof e !== "number" || e < now) return null
    return { id: signature, supervisorId: s, expiresAt: e }
  } catch {
    return null
  }
}
