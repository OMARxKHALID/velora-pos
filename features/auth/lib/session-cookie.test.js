import { expect, test } from "bun:test"
import { cleanIdentity, decodeSession, encodeSession, parseDisabled, serializeDisabled } from "./session-cookie"

test("a signed-in identity survives the cookie round trip", () => {
  const raw = encodeSession({ id: "u-cashier", name: "Hamza Ali", role: "cashier" })
  expect(decodeSession(raw)).toEqual({ id: "u-cashier", name: "Hamza Ali", role: "cashier", title: "Cashier · Shoe Shop", shopId: "shop-shoes" })
  expect(decodeSession(encodeSession({ id: "u-admin", name: "ASIF", role: "admin" })).shopId).toBeNull()
})

test("odd or forged cookie values are rejected instead of crashing", () => {
  for (const raw of ["admin", "constructor", "toString", "__proto__", "", null, undefined, "%%%", "e30"]) {
    expect(decodeSession(raw)).toBeNull()
  }
  expect(cleanIdentity({ id: "u-x", name: "X", role: "constructor" })).toBeNull()
  expect(cleanIdentity({ id: "../etc", name: "X", role: "admin" })).toBeNull()
  expect(cleanIdentity({ id: "u-x", name: "   ", role: "admin" })).toBeNull()
  expect(cleanIdentity({ id: "u-x", name: "  Sana   Malik ", role: "cashier" })).toEqual({ id: "u-x", name: "Sana Malik", role: "cashier" })
})

test("the disabled list is cleaned and capped", () => {
  expect(parseDisabled("u-cashier,,bad id,u-cashier,u-manager-1a2b")).toEqual(["u-cashier", "u-manager-1a2b"])
  expect(parseDisabled(undefined)).toEqual([])
  expect(serializeDisabled(["u-cashier", "nope", "u-cashier"])).toBe("u-cashier")
})
