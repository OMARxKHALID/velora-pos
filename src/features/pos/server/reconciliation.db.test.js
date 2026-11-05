import { describe, expect, test } from "bun:test"
import { hasTestDatabase, useTestDatabase } from "@/test/db"
import { loadDocuments, seedDocuments } from "@/features/sample-data/lib/seed-documents"
import { loadDashboard } from "@/features/analytics/server/dashboard"
import { netRefund, netRevenue } from "@/features/pricing/lib/pricing"
import { decideRefund, requestRefund } from "@/features/refunds/server/service"
import { salesForExport } from "@/features/sales/server/queries"
import { COLLECTIONS as C } from "@/server/db/collections"
import { newId } from "@/shared/lib/id"
import { sumBy } from "@/shared/lib/money"
import { recordSale } from "./sales"
import { closeShift, openShift } from "./shifts"

const SHOP = "shop-shoes"
const SEED_NOW = Date.parse("2026-09-01T12:00:00Z")
const TEST_NOW = Date.parse("2026-09-20T12:00:00Z")

describe.skipIf(!hasTestDatabase)("sales, the Z-report, the dashboard and the sales export agree on the money", () => {
  const context = useTestDatabase()
  const as = (id, role = "cashier", at = new Date(TEST_NOW)) => ({ db: context.db, client: context.client, user: { id, role, shopId: SHOP }, shopId: SHOP, approvalSecret: "x".repeat(40), at })

  test("two sales and one approved refund add up the same way on the Z-report, the dashboard and the export", async () => {
    await loadDocuments(context.db, seedDocuments(SEED_NOW))
    const [stockA, stockB] = await context.db.collection(C.stock).find({ shopId: SHOP, quantity: { $gte: 2 } }).limit(2).toArray()
    const variantA = await context.db.collection(C.variants).findOne({ _id: stockA.variantId })
    const variantB = await context.db.collection(C.variants).findOne({ _id: stockB.variantId })

    const shift = await openShift(as("u-recon"), { openingCash: 0, clientId: newId() })
    const sale1 = await recordSale(as("u-recon"), { clientId: newId(), shiftId: shift.id, lines: [{ variantId: variantA._id, quantity: 2 }], payments: [{ method: "card", amount: variantA.price * 2 }] })
    const sale2 = await recordSale(as("u-recon"), { clientId: newId(), shiftId: shift.id, lines: [{ variantId: variantB._id, quantity: 1 }], payments: [{ method: "card", amount: variantB.price }] })
    const refund = await requestRefund(as("u-recon"), { clientId: newId(), saleId: sale1.id, lines: [{ variantId: variantA._id, quantity: 1 }], reason: "Wrong size", method: "card" })
    const decided = await decideRefund(as("u-manager", "manager"), { refundId: refund.id, approve: true })
    const closed = await closeShift(as("u-recon"), { shiftId: shift.id, countedCash: 0 })

    const grossOfOurSales = sumBy([sale1, sale2], ({ total }) => total)
    expect(closed.summary.revenue).toBe(grossOfOurSales)
    expect(closed.summary.cardRefunds).toBe(decided.total)
    expect(closed.summary.revenue - closed.summary.cardRefunds).toBe(grossOfOurSales - decided.total)

    const exported = await salesForExport(context.db, { shopIds: [SHOP], viewer: { role: "admin" }, range: "today", now: TEST_NOW + 300_000 })
    const ours = exported.filter(({ shiftId }) => shiftId === shift.id)
    expect(ours).toHaveLength(2)
    expect(sumBy(ours, ({ total }) => total)).toBe(grossOfOurSales)

    const netFromExportAndRefund = sumBy(ours, netRevenue) - netRefund(decided)
    const view = await loadDashboard(context.db, { shopIds: [SHOP], scope: "all", range: "today", now: TEST_NOW + 300_000 })
    expect(view.current.revenue).toBe(netFromExportAndRefund)
    expect(view.current.revenue).toBe(closed.summary.revenue - closed.summary.cardRefunds)
  })
})
