import { beforeAll, describe, expect, test } from "bun:test"
import { hasTestDatabase, useTestDatabase } from "@/test/db"
import { loadDocuments, seedDocuments } from "@/features/sample-data/lib/seed-documents"
import { COLLECTIONS as C } from "@/lib/db/collections"
import { startOfDayIn } from "@/lib/zoned"
import { loadDashboard } from "./dashboard"

const now = Date.parse("2026-09-16T13:00:00Z")

describe.skipIf(!hasTestDatabase)("owner dashboard from the database", () => {
  const context = useTestDatabase()

  beforeAll(async () => {
    await loadDocuments(context.db, seedDocuments(now))
  })

  test("the chart adds up to the headline, and nothing but figures leave the server", async () => {
    for (const range of ["today", "7d", "30d"]) {
      const view = await loadDashboard(context.db, { shopIds: ["shop-shoes"], scope: "all", range, now })
      const charted = view.trend.reduce((sum, { revenue }) => sum + revenue, 0)
      expect(Math.round(charted * 100)).toBe(view.current.revenue)
      expect(view.current.count).toBeGreaterThan(0)
      expect(JSON.stringify(view)).not.toContain('"items"')
      expect(view.shopRows).toEqual([expect.objectContaining({ shop: { id: "shop-shoes", name: "Shoe Shop" }, revenue: view.current.revenue })])
    }
  })

  test("today means the shop's day in Pakistan, whatever the server's clock says", async () => {
    const view = await loadDashboard(context.db, { shopIds: ["shop-shoes"], scope: "all", range: "today", now })
    const from = new Date(startOfDayIn("Asia/Karachi", now))
    const sales = await context.db.collection(C.sales).find({ soldAt: { $gte: from, $lt: new Date(now) } }).toArray()
    expect(view.current.count).toBe(sales.length)
    expect(view.trend.every(({ hour }) => hour >= 0 && hour < 24)).toBe(true)
    const peak = view.trend.reduce((best, row) => (row.sales > best.sales ? row : best))
    const inKarachi = sales.map(({ soldAt }) => (soldAt.getUTCHours() + 5) % 24)
    expect(inKarachi).toContain(peak.hour)
  })

  test("stock value, running short and cash short come from the database", async () => {
    const view = await loadDashboard(context.db, { shopIds: ["shop-shoes"], scope: "all", range: "30d", now })
    const stock = await context.db.collection(C.stock).find({ quantity: { $gt: 0 } }).toArray()
    expect(view.stock.pairs).toBe(stock.reduce((sum, { quantity }) => sum + quantity, 0))
    expect(view.short.rows.length).toBeLessThanOrEqual(5)
    const closed = await context.db.collection(C.shifts).find({ status: "closed", closedAt: { $gte: new Date(now - 30 * 864e5) } }).toArray()
    expect(view.closedShifts).toBeLessThanOrEqual(closed.length)
    expect(view.cashiers.map(({ cashierId }) => cashierId)).toContain("u-cashier")
  })
})
