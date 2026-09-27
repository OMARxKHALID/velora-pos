import { expect, test } from "bun:test"
import { seedCatalog } from "@/features/catalog/lib/catalog"
import { applyOpenShift, applyPurchase, applyRefundDecision, applyRefundRequest, applySale, emptyLedger } from "@/features/ledger/lib/rules"
import { createSeed } from "@/features/sample-data/lib/seed"
import { SAMPLE_TEAM } from "@/features/sample-data/lib/team"
import { DAY } from "@/shared/lib/dates"
import { brandPerformance, cashierIdsFor, cashierStats, customRangeError, dailySeries, hourlySeries, lowStock, notSelling, paymentSplit, periodBetween, periodFor, runningShort, splitLiveTail, stockValue, summarize } from "./analytics"

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

test("low stock uses each shop's own category limits and shop setting", () => {
  const state = createSeed(new Date(2026, 8, 16, 15).getTime())
  const [product] = state.products.filter(({ status }) => status === "active")
  const mine = (rows) => rows.filter(({ product: { id } }) => id === product.id)
  const withLimit = (shopId) => ({ ...state, categories: [{ shopId, name: product.category, lowStockAt: 99 }] })

  expect(mine(lowStock(withLimit(product.shopId), 0)).length).toBe(state.variants.filter(({ productId, active }) => productId === product.id && active).length)
  expect(mine(lowStock(withLimit("another-shop"), 0))).toEqual(mine(lowStock(state, 0)))
  expect(lowStock(state, (shopId) => (shopId === product.shopId ? 5 : 0))).toEqual(lowStock(state, 5))
})

test("a product added within the window is not counted as not selling", () => {
  const catalog = seedCatalog()
  const idle = catalog.variants.find(({ productId }) => productId === "p-02")
  const at = Date.now()
  const stocked = applyPurchase({ ...emptyLedger(), ...catalog }, { lines: [{ variantId: idle.id, quantity: 3, unitCost: idle.cost }], supplier: "T", receivedBy: "u-manager", at }).state
  const fresh = { ...stocked, products: stocked.products.map((product) => (product.id === "p-02" ? { ...product, createdAt: at - DAY } : product)) }
  const old = { ...stocked, products: stocked.products.map((product) => (product.id === "p-02" ? { ...product, createdAt: at - 30 * DAY } : product)) }

  expect(notSelling(fresh, 14, at).map(({ product }) => product.id)).not.toContain("p-02")
  expect(notSelling(old, 14, at).map(({ product }) => product.id)).toContain("p-02")
})

test("a custom range compares with the same number of days just before it", () => {
  const from = new Date(2026, 8, 1).getTime()
  const period = periodBetween(from, from + 9 * DAY, from + 30 * DAY)
  expect(period.days).toBe(10)
  expect(period.to).toBe(from + 10 * DAY)
  expect(period.prevTo - period.prevFrom).toBe(period.to - period.from)
  expect(period.prevTo).toBe(from)

  const today = periodBetween(from, from, from + 5 * 3600e3)
  expect(today.days).toBe(1)
  expect(today.to).toBe(from + 5 * 3600e3)
})

test("custom dates must be real, in order, and a year or less", () => {
  expect(customRangeError("2026-09-01", "2026-09-10")).toBeNull()
  expect(customRangeError("2026-09-10", "2026-09-01")).toMatch(/before/)
  expect(customRangeError("2025-01-01", "2026-09-01")).toMatch(/year/)
  expect(customRangeError("", "2026-09-01")).toMatch(/Pick/)
})

test("running short adds sizes that will sell out within a week at the recent pace", () => {
  const catalog = seedCatalog()
  const [fast, slow] = catalog.variants
  const at = Date.now()
  let state = applyPurchase({ ...emptyLedger(), ...catalog }, { lines: [fast, slow].map(({ id, cost }) => ({ variantId: id, quantity: 20, unitCost: cost })), supplier: "T", receivedBy: "u-manager", at: at - 30 * DAY }).state
  const opened = applyOpenShift(state, { cashierId: "u-cashier", openingCash: 0, at: at - 20 * DAY })
  state = applySale(opened.state, { lines: [{ variantId: fast.id, quantity: 16 }], payments: [{ method: "card", amount: fast.price * 16 }], cashierId: "u-cashier", shiftId: opened.record.id, at: at - 7 * DAY }).state

  const rows = runningShort(state, { threshold: 2, now: at })
  const row = rows.find(({ variant }) => variant.id === fast.id)
  expect(row.quantity).toBe(4)
  expect(row.daysLeft).toBeCloseTo(7, 5)
  expect(runningShort(state, { threshold: 2, now: at, horizon: 6 }).some(({ variant }) => variant.id === fast.id)).toBe(false)
  expect(rows.some(({ variant }) => variant.id === slow.id)).toBe(false)
})
