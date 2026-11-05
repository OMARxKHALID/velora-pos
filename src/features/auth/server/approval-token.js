import "server-only"
import { createHmac, timingSafeEqual } from "node:crypto"

export const APPROVAL_TTL_MS = 5 * 60 * 1000

const CLOCK_SLACK_MS = 5 * 60 * 1000

const keyFor = (secret) => createHmac("sha256", secret).update("velora:supervisor-approval").digest()

const sign = (secret, body) => createHmac("sha256", keyFor(secret)).update(body).digest("base64url")

export const issueApproval = (secret, { kind, cashierId, supervisorId, scope, now = Date.now() }) => {
  const body = Buffer.from(JSON.stringify({ k: kind, c: cashierId, s: supervisorId, x: scope, i: now, e: now + APPROVAL_TTL_MS })).toString("base64url")
  return `${body}.${sign(secret, body)}`
}

export const readApproval = (secret, token, { kind, cashierId, now = Date.now() }) => {
  const [body, signature] = typeof token === "string" ? token.split(".") : []
  if (!body || !signature) return null
  const expected = Buffer.from(sign(secret, body))
  const given = Buffer.from(signature)
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null
  try {
    const { k, c, s, x, i, e } = JSON.parse(Buffer.from(body, "base64url").toString("utf8"))
    if (k !== kind || c !== cashierId || typeof i !== "number" || typeof e !== "number") return null
    if (e < now || now < i - CLOCK_SLACK_MS) return null
    return { id: signature, supervisorId: s, scope: x ?? {}, expiresAt: e }
  } catch {
    return null
  }
}
