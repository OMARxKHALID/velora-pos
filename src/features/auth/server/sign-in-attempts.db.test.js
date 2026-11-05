import { describe, expect, test } from "bun:test"
import { hasTestDatabase, useTestDatabase } from "@/test/db"
import { COLLECTIONS as C } from "@/server/db/collections"
import { clientAddress, createSignInAttempts } from "./sign-in-attempts"

const MINUTE = 60 * 1000

describe.skipIf(!hasTestDatabase)("guessing passwords", () => {
  const context = useTestDatabase()

  test("ten wrong passwords lock that username for fifteen minutes; a right one clears it", async () => {
    const attempts = createSignInAttempts(context.db)
    const now = new Date()
    for (let index = 0; index < 10; index += 1) expect(await attempts.claim({ username: "hamza", address: `10.0.0.${index}` }, now)).not.toBeNull()
    expect(await attempts.claim({ username: "hamza", address: "10.0.1.1" }, now)).toBeNull()
    expect(await attempts.claim({ username: "bilal", address: "10.0.1.1" }, now)).not.toBeNull()
    expect(await attempts.claim({ username: "hamza", address: null }, new Date(now.getTime() + 16 * MINUTE))).not.toBeNull()
    await attempts.clear("hamza")
    expect(await attempts.claim({ username: "hamza", address: null }, now)).not.toBeNull()
  })

  test("one address trying many usernames is locked out too", async () => {
    const attempts = createSignInAttempts(context.db, { perAddress: 3 })
    for (const username of ["a1", "a2", "a3"]) await attempts.claim({ username, address: "203.0.113.9" })
    expect(await attempts.claim({ username: "new-name", address: "203.0.113.9" })).toBeNull()
    expect(await attempts.claim({ username: "new-name", address: "203.0.113.10" })).not.toBeNull()
  })

  test("parallel guesses cannot slip past the limit", async () => {
    const attempts = createSignInAttempts(context.db)
    const claims = await Promise.all(Array.from({ length: 15 }, () => attempts.claim({ username: "racer", address: null })))
    expect(claims.filter(Boolean).length).toBeLessThanOrEqual(10)
    expect(await context.db.collection(C.signInFailures).countDocuments({ username: "racer" })).toBeLessThanOrEqual(10)
    for (let attempt = 0; attempt < 10; attempt += 1) await attempts.claim({ username: "racer", address: null })
    expect(await attempts.claim({ username: "racer", address: null })).toBeNull()
    expect(await context.db.collection(C.signInFailures).countDocuments({ username: "racer" })).toBe(10)
  })

  test("the address comes from the proxy headers", () => {
    expect(clientAddress(new Headers({ "x-forwarded-for": "198.51.100.66, 203.0.113.9" }))).toBe("203.0.113.9")
    expect(clientAddress(new Headers({ "x-forwarded-for": "198.51.100.66", "cf-connecting-ip": "203.0.113.9" }), "cf-connecting-ip")).toBe("203.0.113.9")
    expect(clientAddress(new Headers({ "x-forwarded-for": "198.51.100.66" }), "cf-connecting-ip")).toBeNull()
    expect(clientAddress(new Headers({ "x-real-ip": "198.51.100.4" }))).toBe("198.51.100.4")
    expect(clientAddress(new Headers())).toBeNull()
  })
})
