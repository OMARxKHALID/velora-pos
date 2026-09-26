import { expect, test } from "bun:test"
import { createCartStore } from "./cart-store"

test("a cleared sale comes back on undo, but never over a new sale", () => {
  const saved = new Map()
  globalThis.sessionStorage = { getItem: (key) => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, value), removeItem: (key) => saved.delete(key) }
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
