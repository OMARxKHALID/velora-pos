import { expect, test } from "bun:test"
import { APPROVAL_TTL_MS, issueApproval, readApproval } from "./approval-token"

const secret = "unit-secret-that-is-long-enough-12345"

test("an approval token is tied to the cashier, the discount and five minutes", () => {
  const now = 1_000_000
  const token = issueApproval(secret, { cashierId: "u-cashier", supervisorId: "u-manager", discountPct: 10, now })
  expect(readApproval(secret, token, { cashierId: "u-cashier", discountPct: 10, now: now + APPROVAL_TTL_MS - 1 })).toEqual({ id: token.split(".")[1], supervisorId: "u-manager", expiresAt: now + APPROVAL_TTL_MS })
  expect(readApproval(secret, token, { cashierId: "u-cashier", discountPct: 10, now: now + APPROVAL_TTL_MS + 1 })).toBeNull()
  const [body, signature] = token.split(".")
  const forged = Buffer.from(JSON.stringify({ c: "u-cashier", s: "u-manager", p: 50, e: now + APPROVAL_TTL_MS })).toString("base64url")
  expect(readApproval(secret, `${forged}.${signature}`, { cashierId: "u-cashier", discountPct: 50, now })).toBeNull()
  for (const junk of [undefined, "", "a.b", `${body}.`, "x".repeat(10)]) expect(readApproval(secret, junk, { cashierId: "u-cashier", discountPct: 10, now })).toBeNull()
})
