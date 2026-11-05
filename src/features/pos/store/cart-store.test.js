import { beforeEach, expect, test } from "bun:test"
import { createCartStore } from "./cart-store"

beforeEach(() => {
  const saved = new Map()
  globalThis.sessionStorage = { getItem: (key) => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, value), removeItem: (key) => saved.delete(key) }
})

test("a cleared sale comes back on undo, but never over a new sale", () => {
  const store = createCartStore()
  store.getState().add("v-1")
  store.getState().setDiscount(10, "u-manager")
  const removed = store.getState().clear()
  expect(store.getState().lines).toEqual([])

  expect(store.getState().restore(removed)).toBe(true)
  expect(store.getState()).toMatchObject({ discountPct: 10, approvedBy: "u-manager", lines: [{ variantId: "v-1", quantity: 1 }] })

  const again = store.getState().clear()
  store.getState().add("v-2")
  expect(store.getState().restore(again)).toBe(false)
  expect(store.getState().lines.map(({ variantId }) => variantId)).toEqual(["v-2"])
})

test("scanning the same pair again raises its quantity instead of adding a second line", () => {
  const store = createCartStore()
  store.getState().add("v-1")
  store.getState().add("v-1")
  store.getState().add("v-2", "pick")
  expect(store.getState().lines).toEqual([
    { variantId: "v-1", quantity: 2, entry: "scan" },
    { variantId: "v-2", quantity: 1, entry: "pick" },
  ])
})

test("setting a quantity to zero removes the line, and an unknown line is a no-op", () => {
  const store = createCartStore()
  store.getState().add("v-1")
  store.getState().setQuantity("v-1", 3)
  expect(store.getState().lines).toEqual([{ variantId: "v-1", quantity: 3, entry: "scan" }])
  store.getState().setQuantity("v-1", 0)
  expect(store.getState().lines).toEqual([])
  store.getState().setQuantity("v-missing", 5)
  expect(store.getState().lines).toEqual([])
})

test("setCustomer only overwrites the fields it is given", () => {
  const store = createCartStore()
  store.getState().setCustomer({ name: "Zain", phone: "0300" })
  store.getState().setCustomer({ name: "Zain Malik" })
  expect(store.getState()).toMatchObject({ customerName: "Zain Malik", customerPhone: "0300" })
  store.getState().setCustomer({ phone: "" })
  expect(store.getState()).toMatchObject({ customerName: "Zain Malik", customerPhone: "" })
})

test("prune drops lines for variants that no longer exist, and load replaces the whole cart", () => {
  const store = createCartStore()
  store.getState().add("v-1")
  store.getState().add("v-2")
  store.getState().prune(new Set(["v-2"]))
  expect(store.getState().lines.map(({ variantId }) => variantId)).toEqual(["v-2"])

  store.getState().load({ lines: [{ variantId: "v-9", quantity: 4, entry: "scan" }], discountPct: 15, approvedBy: "u-manager", approvalToken: "tok" })
  expect(store.getState()).toMatchObject({ lines: [{ variantId: "v-9", quantity: 4 }], discountPct: 15, approvedBy: "u-manager", approvalToken: "tok", customerName: "", customerPhone: "" })
})
