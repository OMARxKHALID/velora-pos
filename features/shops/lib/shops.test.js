import { expect, test } from "bun:test"
import { createSeed } from "@/features/sample-data/lib/seed"
import { ALL_SHOPS, scopeState, shops } from "./shops"

test("scoping to a shop keeps only that shop's records", () => {
  const state = createSeed()
  const other = { ...state, sales: [...state.sales, { ...state.sales[0], id: "x", shopId: "shop-clothes" }] }
  expect(scopeState(other, ALL_SHOPS).sales).toHaveLength(state.sales.length + 1)
  const scoped = scopeState(other, shops[0].id)
  expect(scoped.sales).toHaveLength(state.sales.length)
  expect(scoped.products).toHaveLength(state.products.length)
  expect(scopeState(state, "shop-none").variants).toHaveLength(0)
})
