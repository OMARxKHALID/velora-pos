import { expect, test } from "bun:test"
import { createSeed } from "@/features/sample-data/lib/seed"
import { ALL_SHOPS, scopeState, settingsFor, shopName } from "./shops"

test("scoping to a shop keeps only that shop's records", () => {
  const state = createSeed()
  const other = { ...state, sales: [...state.sales, { ...state.sales[0], id: "x", shopId: "shop-second" }] }
  expect(scopeState(other, ALL_SHOPS).sales).toHaveLength(state.sales.length + 1)
  const scoped = scopeState(other, state.shops[0].id)
  expect(scoped.sales).toHaveLength(state.sales.length)
  expect(scoped.products).toHaveLength(state.products.length)
  expect(scopeState(state, "shop-none").variants).toHaveLength(0)
})

test("shop names come from the shops the server sent", () => {
  const shops = [{ id: "shop-shoes", name: "Velora Shoes" }]
  expect(shopName(ALL_SHOPS, shops)).toBe("All shops")
  expect(shopName("shop-shoes", shops)).toBe("Velora Shoes")
  expect(shopName("shop-gone", shops)).toBe("Shop")
})

test("a shop's settings come from its own document, falling back to the first shop", () => {
  const shops = [
    { id: "a", settings: { taxEnabled: true, taxRate: 18 } },
    { id: "b", settings: { taxEnabled: false, taxRate: 0 } },
  ]
  expect(settingsFor(shops, "b")).toMatchObject({ taxEnabled: false })
  expect(settingsFor(shops, "a")).toMatchObject({ taxRate: 18 })
  expect(settingsFor(shops, "all")).toMatchObject({ taxRate: 18 })
  expect(settingsFor([], "a")).toMatchObject({ taxEnabled: false, cashRounding: 1 })
})
