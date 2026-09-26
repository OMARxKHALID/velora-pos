import { expect, test } from "bun:test"
import { fitToStock } from "./cart-fit"

test("resuming a held cart trims lines to the stock that is left", () => {
  const lines = [
    { variantId: "a", quantity: 2 },
    { variantId: "b", quantity: 3 },
    { variantId: "c", quantity: 1 },
  ]
  const { lines: kept, adjusted } = fitToStock(lines, { a: 5, b: 1, c: 0 })
  expect(kept).toEqual([{ variantId: "a", quantity: 2 }, { variantId: "b", quantity: 1 }])
  expect(adjusted).toEqual([
    { variantId: "b", wanted: 3, kept: 1 },
    { variantId: "c", wanted: 1, kept: 0 },
  ])
  expect(fitToStock(lines, { a: 9, b: 9, c: 9 }).adjusted).toEqual([])
  expect(fitToStock([{ variantId: "x", quantity: 1 }], { x: -2 }).lines).toEqual([])
})
