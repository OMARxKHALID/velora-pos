import { expect, test } from "bun:test"
import { createAttemptLimiter } from "./pin-attempts"
import { checkPin, hasPin, hashPin, parsePins, pinHolders, serializePins } from "./supervisor-pins"

test("a PIN is stored only as a salted hash and checks against the right supervisor", () => {
  const stored = hashPin("u-manager-2", "4821")
  expect(stored).not.toContain("4821")
  expect(hashPin("u-manager-2", "4821")).not.toBe(stored)
  const pins = { "u-manager-2": stored }
  expect(checkPin(pins, "u-manager-2", "4821")).toBe(true)
  expect(checkPin(pins, "u-manager-2", "4822")).toBe(false)
  expect(checkPin({ "u-other": stored }, "u-other", "4821")).toBe(false)
  expect(checkPin(pins, "u-manager-2", "48a1")).toBe(false)
})

test("the seeded supervisor starts with the demo PIN until the owner changes it", () => {
  expect(hasPin({}, "u-manager")).toBe(true)
  expect(checkPin({}, "u-manager", "1234")).toBe(true)
  const changed = { "u-manager": hashPin("u-manager", "9876") }
  expect(checkPin(changed, "u-manager", "1234")).toBe(false)
  expect(checkPin(changed, "u-manager", "9876")).toBe(true)
  expect(hasPin({}, "u-manager-new")).toBe(false)
  expect(pinHolders({ "u-manager-new": "x.y" }).toSorted()).toEqual(["u-manager", "u-manager-new"])
})

test("the PIN cookie survives a round trip and ignores anything forged", () => {
  const pins = { "u-manager": hashPin("u-manager", "1111") }
  expect(parsePins(serializePins(pins))).toEqual(pins)
  for (const raw of [undefined, "", "%%%", "e30", Buffer.from('{"../x":"a.b","u-ok":5}').toString("base64url")]) {
    expect(parsePins(raw)).toEqual({})
  }
})

test("repeated wrong PINs lock that supervisor for a while", () => {
  const limiter = createAttemptLimiter({ limit: 3, window: 1000 })
  for (let attempt = 0; attempt < 3; attempt += 1) limiter.fail("u-manager", 100)
  expect(limiter.blocked("u-manager", 200)).toBe(true)
  expect(limiter.blocked("u-other", 200)).toBe(false)
  expect(limiter.blocked("u-manager", 1200)).toBe(false)
  limiter.fail("u-manager", 1300)
  limiter.clear("u-manager")
  expect(limiter.blocked("u-manager", 1301)).toBe(false)
})
