import { expect, test } from "bun:test"
import { adoptHeldCarts, applyHoldCart, applyTakeHeldCart, heldAt } from "./held-carts"

const cart = { lines: [{ variantId: "v1", quantity: 1 }], discountPct: 10, approvedBy: "u-manager", customerName: "", customerPhone: "" }

test("held carts belong to a counter and are numbered per counter", () => {
  const first = applyHoldCart([], { cart, at: 1 })
  const second = applyHoldCart(first.heldCarts, { cart, at: 2, registerId: "reg-2" })
  const third = applyHoldCart(second.heldCarts, { cart: { ...cart, customerName: "Sana" }, at: 3 })
  expect(first.record.label).toBe("Order #1")
  expect(second.record.label).toBe("Order #1")
  expect(third.record.label).toBe("Sana")
  expect(heldAt(third.heldCarts)).toHaveLength(2)
  expect(heldAt(third.heldCarts, "reg-2")).toHaveLength(1)
  expect(third.record).toMatchObject({ discountPct: 10, approvedBy: "u-manager" })
  expect(() => applyHoldCart([], { cart: { ...cart, lines: [] }, at: 1 })).toThrow("empty")
})

test("a held cart can only be resumed once", () => {
  const { heldCarts, record } = applyHoldCart([], { cart, at: 1 })
  const taken = applyTakeHeldCart(heldCarts, record.id)
  expect(taken.record.id).toBe(record.id)
  expect(taken.heldCarts).toEqual([])
  expect(() => applyTakeHeldCart(taken.heldCarts, record.id)).toThrow("already resumed")
})

test("carts held in an older version are adopted once", () => {
  const legacy = [{ id: "old-1", lines: cart.lines, label: "Old", parkedAt: 1 }, { id: "empty", lines: [] }]
  const adopted = adoptHeldCarts([], legacy)
  expect(adopted).toHaveLength(1)
  expect(adopted[0]).toMatchObject({ id: "old-1", registerId: "reg-1" })
  expect(adoptHeldCarts(adopted, legacy)).toHaveLength(1)
})
