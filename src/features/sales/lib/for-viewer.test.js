import { expect, test } from "bun:test"
import { saleForViewer, withoutCosts } from "./for-viewer"

const sale = { id: "s1", items: [{ variantId: "v1", unitPrice: 1250000, unitCost: 600000 }] }

test("cashiers never receive what a pair cost the shop", () => {
  expect(withoutCosts(sale).items[0]).toEqual({ variantId: "v1", unitPrice: 1250000 })
  expect(saleForViewer({ role: "cashier" })(sale).items[0].unitCost).toBeUndefined()
  expect(saleForViewer({ role: "manager" })(sale).items[0].unitCost).toBe(600000)
})
