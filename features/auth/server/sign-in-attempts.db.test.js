import { describe, expect, test } from "bun:test"
import { hasTestDatabase, useTestDatabase } from "@/test/db"
import { clientAddress, createSignInAttempts } from "./sign-in-attempts"

const MINUTE = 60 * 1000

describe.skipIf(!hasTestDatabase)("guessing passwords", () => {
  const context = useTestDatabase()

  test("ten wrong passwords lock that username for fifteen minutes; a right one clears it", async () => {
    const attempts = createSignInAttempts(context.db)
    const now = new Date()
    for (let index = 0; index < 10; index += 1) await attempts.fail({ username: "hamza", address: `10.0.0.${index}` }, now)
    expect(await attempts.blocked({ username: "hamza", address: "10.0.1.1" }, now)).toBe(true)
    expect(await attempts.blocked({ username: "bilal", address: "10.0.1.1" }, now)).toBe(false)
    expect(await attempts.blocked({ username: "hamza", address: null }, new Date(now.getTime() + 16 * MINUTE))).toBe(false)
    await attempts.clear("hamza")
    expect(await attempts.blocked({ username: "hamza", address: null }, now)).toBe(false)
  })

  test("one address trying many usernames is locked out too", async () => {
    const attempts = createSignInAttempts(context.db, { perAddress: 3 })
    for (const username of ["a1", "a2", "a3"]) await attempts.fail({ username, address: "203.0.113.9" })
    expect(await attempts.blocked({ username: "new-name", address: "203.0.113.9" })).toBe(true)
    expect(await attempts.blocked({ username: "new-name", address: "203.0.113.10" })).toBe(false)
  })

  test("the address comes from the proxy headers", () => {
    expect(clientAddress(new Headers({ "x-forwarded-for": "203.0.113.9, 10.0.0.1" }))).toBe("203.0.113.9")
    expect(clientAddress(new Headers({ "x-real-ip": "198.51.100.4" }))).toBe("198.51.100.4")
    expect(clientAddress(new Headers())).toBeNull()
  })
})
