import { describe, expect, test } from "bun:test"
import { migrateDemoState } from "./migrate"
import { createSeed } from "./seed"

const oldCode = (color) => color.split("/").map((part) => part.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3)).join("")

const asVersion6 = (state) => {
  const oldIdFor = Object.fromEntries(state.variants.map(({ id, productId, attributes }) => [id, `${productId}-${oldCode(attributes.color)}-${attributes.size}`]))
  const old = (variantId) => oldIdFor[variantId]
  const withOldIds = (items) => items.map((item) => ({ ...item, variantId: old(item.variantId) }))
  return {
    ...state,
    variants: state.variants.map((variant) => ({ ...variant, id: old(variant.id) })),
    stock: Object.fromEntries(Object.entries(state.stock).map(([variantId, quantity]) => [old(variantId), quantity])),
    movements: state.movements.map((movement) => ({ ...movement, variantId: old(movement.variantId) })),
    sales: state.sales.map((sale) => ({ ...sale, items: withOldIds(sale.items) })),
    refunds: state.refunds.map(({ approvedInShiftId: _dropped, ...refund }) => ({ ...refund, items: withOldIds(refund.items) })),
    purchases: state.purchases.map((purchase) => ({ ...purchase, items: withOldIds(purchase.items) })),
    shifts: state.shifts.map(({ summary: _dropped, ...shift }) => shift),
  }
}

describe("stored demo data from the previous version", () => {
  const seeded = createSeed()
  const migrated = migrateDemoState(asVersion6(seeded), 6)

  test("keeps every sale, refund and movement, pointing at the new item ids", () => {
    const ids = new Set(migrated.variants.map(({ id }) => id))
    expect(ids).toEqual(new Set(seeded.variants.map(({ id }) => id)))
    expect(migrated.stock).toEqual(seeded.stock)
    expect(migrated.sales.flatMap(({ items }) => items).every(({ variantId }) => ids.has(variantId))).toBe(true)
    expect(migrated.movements.every(({ variantId }) => ids.has(variantId))).toBe(true)
    expect(migrated.refunds.flatMap(({ items }) => items).every(({ variantId }) => ids.has(variantId))).toBe(true)
  })

  test("closed shifts keep the report they had", () => {
    expect(migrated.shifts.map(({ summary }) => summary)).toEqual(seeded.shifts.map(({ summary }) => summary))
  })

  test("offline sales waiting from the previous version stay queued, and the PIN leaves the browser", () => {
    const saved = { ...seeded, outbox: [seeded.sales[0].id], settings: { taxRate: 0, managerPin: "1234" } }
    const upgraded = migrateDemoState(saved, 7)
    expect(upgraded.outbox).toEqual([{ kind: "sale", id: seeded.sales[0].id }])
    expect(upgraded.settings).toEqual({ taxRate: 0 })
    expect(upgraded.heldCarts).toEqual([])
    expect(migrateDemoState(asVersion6(saved), 6).settings).toEqual({ taxRate: 0 })
  })

  test("the staff list no longer lives in the browser", () => {
    const upgraded = migrateDemoState({ ...seeded, outbox: [], staff: { "u-x": { id: "u-x" } } }, 8)
    expect("staff" in upgraded).toBe(false)
    expect(upgraded.sales).toHaveLength(seeded.sales.length)
  })

  test("anything older starts again from fresh demo data", () => {
    expect(migrateDemoState({ sales: [] }, 5)).toEqual({})
  })
})
