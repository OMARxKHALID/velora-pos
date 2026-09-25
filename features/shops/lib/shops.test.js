import { expect, test } from "bun:test"
import { createSeed } from "@/features/sample-data/lib/seed"
import { ALL_SHOPS, scopeState, shopName } from "./shops"

test("scoping to a shop keeps only that shop's records", () => {
  const state = createSeed()
  const other = { ...state, sales: [...state.sales, { ...state.sales[0], id: "x", shopId: "shop-clothes" }] }
  expect(scopeState(other, ALL_SHOPS).sales).toHaveLength(state.sales.length + 1)
  const scoped = scopeState(other, "shop-shoes")
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
