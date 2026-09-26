import { expect, test } from "bun:test"
import { seedCatalog } from "@/features/catalog/lib/catalog"
import { applyOpenShift, applyPurchase, applyRefundDecision, applyRefundRequest, applySale, emptyLedger } from "@/features/ledger/lib/rules"
import { createSeed } from "@/features/sample-data/lib/seed"
import { SAMPLE_TEAM } from "@/features/sample-data/lib/team"
import { brandPerformance, cashierIdsFor, cashierStats, dailySeries, hourlySeries, lowStock, notSelling, paymentSplit, periodFor, splitLiveTail, stockValue, summarize } from "./analytics"

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

test("charts add up to the headline numbers because refunds come off the day they were approved", () => {
  const state = createSeed(new Date(2026, 8, 16, 15).getTime())
  const period = periodFor("30d", new Date(2026, 8, 16, 15).getTime())
  const summary = summarize(state, period.from, period.to)
  expect(summary.refunds.length).toBeGreaterThan(0)

  const days = dailySeries(summary, period.from, period.days)
  expect(days.reduce((sum, { revenue }) => sum + revenue, 0)).toBeCloseTo(summary.revenue / 100, 2)
  expect(days.reduce((sum, { profit }) => sum + profit, 0)).toBeCloseTo(summary.profit / 100, 2)
})

test("the hourly chart shows opening hours and stretches to include late or early trade", () => {
  const empty = { sales: [], impacts: [] }
  expect(hourlySeries(empty).map(({ hour }) => hour)).toEqual([10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21])

  const sale = (hour) => ({ soldAt: new Date(2026, 8, 16, hour, 5).getTime(), total: 100000, taxTotal: 0, items: [{ total: 100000, unitCost: 40000, quantity: 1 }] })
  const stretched = hourlySeries({ sales: [sale(8), sale(23)], impacts: [] })
  expect(stretched[0].hour).toBe(8)
  expect(stretched.at(-1).hour).toBe(23)
  expect(stretched.reduce((sum, { sales }) => sum + sales, 0)).toBe(2)

  const refunded = hourlySeries({ sales: [sale(12)], impacts: [{ at: new Date(2026, 8, 16, 14).getTime(), revenue: 40000, profit: 10000 }] })
  expect(refunded.find(({ hour }) => hour === 12).revenue).toBe(1000)
  expect(refunded.find(({ hour }) => hour === 14).revenue).toBe(-400)
})

test("low stock follows the shop setting when one is given", () => {
  const state = createSeed(new Date(2026, 8, 16, 15).getTime())
  expect(lowStock(state, 5).length).toBeGreaterThan(lowStock(state, 0).length)
  expect(lowStock(state).every(({ quantity, variant }) => quantity <= variant.lowStockAt)).toBe(true)
  expect(lowStock(state, () => 5)).toEqual(lowStock(state, 5))
})

test("the staff panel lists current cashiers and anyone who has sold", () => {
  const state = createSeed(new Date(2026, 8, 16, 15).getTime())
  const staff = { ...SAMPLE_TEAM, "u-cashier-new": { id: "u-cashier-new", name: "New", role: "cashier" }, "u-cashier-gone": { id: "u-cashier-gone", name: "Gone", role: "cashier", removed: true } }
  const ids = cashierIdsFor(state, staff)
  expect(ids).toContain("u-cashier")
  expect(ids).toContain("u-cashier-new")
  expect(ids).not.toContain("u-cashier-gone")
})

test("the chart draws only the unfinished last point dashed and leaves future hours empty", () => {
  const days = splitLiveTail([{ day: 1, revenue: 5, profit: 2 }, { day: 2, revenue: 6, profit: 3 }, { day: 3, revenue: 1, profit: 0 }], false)
  expect(days.map(({ revenueDone }) => revenueDone)).toEqual([5, 6, null])
  expect(days.map(({ revenueLive }) => revenueLive)).toEqual([null, 6, 1])

  const hours = splitLiveTail([{ hour: 10, revenue: 5, profit: 2 }, { hour: 11, revenue: 4, profit: 1 }, { hour: 12, revenue: 0, profit: 0 }], true, 11)
  expect(hours.map(({ revenue }) => revenue)).toEqual([5, 4, null])
  expect(hours.map(({ profitLive }) => profitLive)).toEqual([2, 1, null])
})
