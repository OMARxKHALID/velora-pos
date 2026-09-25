import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { SAVE_FAILED_EVENT } from "../lib/storage"
import { createDemoStore } from "./demo-store"

const memoryStorage = () => {
  const items = new Map()
  return {
    full: false,
    getItem: (key) => items.get(key) ?? null,
    setItem(key, value) {
      if (this.full) throw new Error("QuotaExceededError")
      items.set(key, String(value))
    },
    removeItem: (key) => items.delete(key),
  }
}

const openStore = () => {
  const store = createDemoStore()
  store.persist.rehydrate()
  if (!store.getState().sales.length) store.getState().resetDemo()
  store.setState({ hydrated: true })
  return store
}

describe("demo store in a browser", () => {
  beforeEach(() => {
    globalThis.window = Object.assign(new EventTarget(), { localStorage: memoryStorage(), sessionStorage: memoryStorage() })
  })
  afterEach(() => {
    delete globalThis.window
  })

  test("a second tab works from what the first tab saved", () => {
    const first = openStore()
    const second = openStore()
    first.getState().openShift({ cashierId: "u-cashier", openingCash: 0 })
    expect(() => second.getState().openShift({ cashierId: "u-cashier", openingCash: 0 })).toThrow("already open")
    expect(second.getState().shifts.filter(({ status }) => status === "open")).toHaveLength(1)
  })

  test("a held cart is shared by every tab and can be resumed only once", () => {
    const first = openStore()
    const second = openStore()
    const state = first.getState()
    const variant = state.variants.find(({ active }) => active)
    const held = first.getState().holdCart({ cart: { lines: [{ variantId: variant.id, quantity: 1 }] } })
    expect(second.getState().takeHeldCart(held.id).id).toBe(held.id)
    expect(() => first.getState().takeHeldCart(held.id)).toThrow("already resumed")
    expect(first.getState().heldCarts).toEqual([])
  })

  test("a failed save is reported instead of silently lost", () => {
    const store = openStore()
    let failures = 0
    window.addEventListener(SAVE_FAILED_EVENT, () => (failures += 1))
    window.localStorage.full = true
    store.getState().openShift({ cashierId: "u-cashier", openingCash: 0 })
    expect(failures).toBeGreaterThan(0)
  })

  test("only an active cashier can sell", () => {
    const store = openStore()
    const shift = store.getState().openShift({ cashierId: "u-cashier", openingCash: 0 })
    const state = store.getState()
    const variant = state.variants.find(({ id, active }) => active && (state.stock[id] ?? 0) > 0)
    const sale = { lines: [{ variantId: variant.id, quantity: 1 }], payments: [{ method: "cash", amount: variant.price }], cashierId: "u-manager", shiftId: shift.id }
    expect(() => store.getState().recordSale(sale)).toThrow("active cashier")
  })
})
