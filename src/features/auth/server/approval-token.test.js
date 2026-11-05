import { expect, test } from "bun:test"
import { APPROVAL_TTL_MS, issueApproval, readApproval } from "./approval-token"

const secret = "unit-secret-that-is-long-enough-12345"
const MINUTE = 60 * 1000

test("an approval token is tied to its kind, the cashier, its scope and five minutes", () => {
  const now = 100 * MINUTE
  const token = issueApproval(secret, { kind: "discount", cashierId: "u-cashier", supervisorId: "u-manager", scope: { pct: 10, subtotal: 5000 }, now })
  const read = (overrides = {}) => readApproval(secret, token, { kind: "discount", cashierId: "u-cashier", now, ...overrides })
  expect(read({ now: now + APPROVAL_TTL_MS - 1 })).toEqual({ id: token.split(".")[1], supervisorId: "u-manager", scope: { pct: 10, subtotal: 5000 }, expiresAt: now + APPROVAL_TTL_MS })
  expect(read({ now: now + APPROVAL_TTL_MS + 1 })).toBeNull()
  expect(read({ now: now - 6 * MINUTE })).toBeNull()
  expect(read({ kind: "discard" })).toBeNull()
  expect(read({ cashierId: "u-other" })).toBeNull()
  const [body, signature] = token.split(".")
  const forged = Buffer.from(JSON.stringify({ k: "discount", c: "u-cashier", s: "u-manager", x: { pct: 50, subtotal: 5000 }, i: now, e: now + APPROVAL_TTL_MS })).toString("base64url")
  expect(readApproval(secret, `${forged}.${signature}`, { kind: "discount", cashierId: "u-cashier", now })).toBeNull()
  for (const junk of [undefined, "", "a.b", `${body}.`, "x".repeat(10)]) expect(readApproval(secret, junk, { kind: "discount", cashierId: "u-cashier", now })).toBeNull()
})
