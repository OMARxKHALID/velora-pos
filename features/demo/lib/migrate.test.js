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

  test("anything older starts again from fresh demo data", () => {
    expect(migrateDemoState({ sales: [] }, 5)).toEqual({})
  })
})
