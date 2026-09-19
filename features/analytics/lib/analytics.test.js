import { expect, test } from "bun:test"
import { seedCatalog } from "@/features/catalog/lib/catalog"
import { applyOpenShift, applyPurchase, applyRefundDecision, applyRefundRequest, applySale, emptyLedger } from "@/features/demo/lib/ledger"
import { brandPerformance, cashierStats, notSelling, paymentSplit, periodFor, stockValue, summarize } from "./analytics"

test("net revenue and profit subtract approved refunds, keeping cost when restocked", () => {
  const catalog = seedCatalog()
  const shoe = catalog.variants[0]
  const at = Date.now()
  let state = applyPurchase({ ...emptyLedger(), ...catalog }, { lines: [{ variantId: shoe.id, quantity: 5, unitCost: shoe.cost }], supplier: "T", receivedBy: "u-manager", at }).state
  const opened = applyOpenShift(state, { cashierId: "u-cashier", openingCash: 0, at })
  const sold = applySale(opened.state, { lines: [{ variantId: shoe.id, quantity: 2 }], payments: [{ method: "card", amount: shoe.price * 2 }], cashierId: "u-cashier", shiftId: opened.record.id, at })
  const requested = applyRefundRequest(sold.state, { saleId: sold.record.id, lines: [{ variantId: shoe.id, quantity: 1, restock: true }], reason: "Wrong size", method: "card", requestedBy: "u-cashier", shiftId: opened.record.id, at })
  state = applyRefundDecision(requested.state, { refundId: requested.record.id, approve: true, userId: "u-manager", at }).state

  const summary = summarize(state, at - 1000, at + 1000)
  expect(summary.revenue).toBe(shoe.price)
  expect(summary.profit).toBe(shoe.price - shoe.cost)
  expect(summary.count).toBe(1)

  const [hamza] = cashierStats(state, summary.sales, summary.refunds, at - 1000, at + 1000, ["u-cashier"])
  expect(hamza.refundCount).toBe(1)
  expect(hamza.refundRate).toBeCloseTo(0.5)
})

test("comparison period covers the same elapsed time", () => {
  const now = new Date("2026-09-19T15:30:00").getTime()
  const today = periodFor("today", now)
  expect(today.to - today.from).toBe(today.prevTo - today.prevFrom)
  expect(new Date(today.prevTo).getHours()).toBe(15)
})

test("brands, dead stock and payment split come from the same sales", () => {
  const catalog = seedCatalog()
  const [sold, idle] = [catalog.variants[0], catalog.variants.find(({ productId }) => productId === "p-02")]
  const at = Date.now()
  let state = applyPurchase({ ...emptyLedger(), ...catalog }, { lines: [sold, idle].map(({ id, cost }) => ({ variantId: id, quantity: 3, unitCost: cost })), supplier: "T", receivedBy: "u-manager", at }).state
  const opened = applyOpenShift(state, { cashierId: "u-cashier", openingCash: 0, at })
  state = applySale(opened.state, { lines: [{ variantId: sold.id, quantity: 1 }], payments: [{ method: "cash", amount: sold.price + 50000 }], cashierId: "u-cashier", shiftId: opened.record.id, at }).state

  expect(brandPerformance(state, state.sales)).toEqual([{ brand: "Velora", revenue: sold.price, pairs: 1 }])
  expect(notSelling(state, 14, at + 1).map(({ product }) => product.id)).toEqual(["p-02"])
  expect(paymentSplit(state.sales)).toEqual({ cash: sold.price, card: 0, cashShare: 1 })
  expect(stockValue(state).pairs).toBe(5)
})
