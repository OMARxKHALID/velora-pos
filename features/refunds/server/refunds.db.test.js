import { beforeAll, describe, expect, test } from "bun:test"
import { hasTestDatabase, useTestDatabase } from "@/test/db"
import { loadDocuments, seedDocuments } from "@/features/sample-data/lib/seed-documents"
import { resetSampleData } from "@/features/sample-data/server/sample-data"
import { ledgerSnapshot } from "@/features/ledger/server/snapshot"
import { recordSale } from "@/features/pos/server/sales"
import { closeShift, openShift } from "@/features/pos/server/shifts"
import { updateSettings } from "@/features/settings/server/service"
import { COLLECTIONS as C } from "@/lib/db/collections"
import { newId } from "@/lib/id"
import { decideRefund, requestRefund } from "./service"

const SHOP = "shop-shoes"

describe.skipIf(!hasTestDatabase)("returns, settings and what each role can read", () => {
  const context = useTestDatabase()
  const as = (id, role = "cashier") => ({ db: context.db, client: context.client, user: { id, role, shopId: SHOP }, shopId: SHOP, approvalSecret: "x".repeat(40) })
  const stockOf = async (variantId) => (await context.db.collection(C.stock).findOne({ variantId }))?.quantity ?? 0
  let shift
  let sale
  let variant

  beforeAll(async () => {
    await loadDocuments(context.db, seedDocuments(new Date(2026, 8, 16, 18).getTime()))
    shift = await openShift(as("u-cashier"), { openingCash: 1000000, clientId: newId() })
    const stock = await context.db.collection(C.stock).findOne({ shopId: SHOP, quantity: { $gte: 3 } })
    variant = await context.db.collection(C.variants).findOne({ _id: stock.variantId })
    sale = await recordSale(as("u-cashier"), { clientId: newId(), shiftId: shift.id, lines: [{ variantId: variant._id, quantity: 2 }], payments: [{ method: "cash", amount: variant.price * 2 }] })
  })

  test("a cashier asks, a supervisor approves, stock comes back and the drawer pays it", async () => {
    const before = await stockOf(variant._id)
    const request = { clientId: newId(), saleId: sale.id, lines: [{ variantId: variant._id, quantity: 1 }], reason: "Wrong size", method: "cash" }
    const [refund, again] = await Promise.all([requestRefund(as("u-cashier"), request), requestRefund(as("u-cashier"), request)])
    expect(again.id).toBe(refund.id)
    expect(refund).toMatchObject({ status: "pending", total: variant.price, requestedBy: "u-cashier", shiftId: shift.id })
    await expect(requestRefund(as("u-cashier"), { ...request, clientId: newId(), lines: [{ variantId: variant._id, quantity: 2 }] })).rejects.toThrow("more than was sold")

    const results = await Promise.allSettled([decideRefund(as("u-manager", "manager"), { refundId: refund.id, approve: true }), decideRefund(as("u-manager", "manager"), { refundId: refund.id, approve: true })])
    expect(results.filter(({ status }) => status === "fulfilled")).toHaveLength(1)
    expect(results.find(({ status }) => status === "rejected").reason.message).toMatch("already decided")
    const decided = await context.db.collection(C.refunds).findOne({ _id: refund.id })
    expect(decided).toMatchObject({ status: "approved", decidedBy: "u-manager", payoutShiftId: shift.id, approvedInShiftId: shift.id })
    expect(await stockOf(variant._id)).toBe(before + 1)
    expect(await context.db.collection(C.movements).findOne({ "ref.id": refund.id })).toMatchObject({ type: "return", quantity: 1, unitCost: variant.cost })
  })

  test("a cashier cannot return someone else's sale, and money goes back the way it came", async () => {
    await expect(requestRefund(as("u-cashier-2"), { clientId: newId(), saleId: sale.id, lines: [{ variantId: variant._id, quantity: 1 }], reason: "Wrong size", method: "cash" })).rejects.toThrow("your own sales")
    await expect(requestRefund(as("u-cashier"), { clientId: newId(), saleId: sale.id, lines: [{ variantId: variant._id, quantity: 1 }], reason: "Wrong size", method: "card" })).rejects.toThrow("not paid by card")
    await expect(requestRefund(as("u-cashier"), { clientId: newId(), saleId: "nope", lines: [{ variantId: variant._id, quantity: 1 }], reason: "Wrong size", method: "cash" })).rejects.toThrow("Sale not found")
  })

  test("a cash refund waits for an open drawer; rejecting never touches stock", async () => {
    const refund = await requestRefund(as("u-cashier"), { clientId: newId(), saleId: sale.id, lines: [{ variantId: variant._id, quantity: 1 }], reason: "Customer changed mind", method: "cash" })
    await closeShift(as("u-cashier"), { shiftId: shift.id, countedCash: 0 })
    await expect(decideRefund(as("u-manager", "manager"), { refundId: refund.id, approve: true })).rejects.toThrow("Open a counter shift first")
    const before = await stockOf(variant._id)
    await decideRefund(as("u-manager", "manager"), { refundId: refund.id, approve: false })
    expect(await stockOf(variant._id)).toBe(before)
    expect((await context.db.collection(C.refunds).findOne({ _id: refund.id })).status).toBe("rejected")
  })

  test("settings are checked and every change is audited", async () => {
    const owner = { ...as("u-admin", "admin") }
    const saved = await updateSettings(owner, { taxEnabled: true, taxRate: 17.5, taxLabel: "GST" })
    expect(saved).toMatchObject({ taxEnabled: true, taxRate: 17.5, taxLabel: "GST" })
    await expect(updateSettings(owner, { taxRate: 101 })).rejects.toThrow()
    await expect(updateSettings(owner, { lowStockThreshold: 0 })).rejects.toThrow()
    await expect(updateSettings(owner, { managerPin: "0000" })).rejects.toThrow()
    const audit = await context.db.collection(C.auditLog).findOne({ kind: "settings.update" })
    expect(audit.changes).toMatchObject({ taxRate: { from: 0, to: 17.5 }, taxEnabled: { from: false, to: true } })
  })

  test("each role reads only what it should", async () => {
    await context.db.collection(C.shifts).insertOne({ _id: "shift-other", shopId: SHOP, registerId: "reg-1", cashierId: "u-cashier-2", status: "closed", openedAt: new Date(), closedAt: new Date(), openingCash: 0, countedCash: 0, difference: -5000 })
    const cashier = await ledgerSnapshot(context.db, { user: { id: "u-cashier", role: "cashier", shopId: SHOP } })
    expect(cashier.variants.every((item) => !("cost" in item))).toBe(true)
    expect(cashier.usedVariantIds).toEqual([])
    expect(cashier.refunds.every(({ requestedBy }) => requestedBy === "u-cashier")).toBe(true)
    expect("sales" in cashier || "movements" in cashier || "purchases" in cashier).toBe(false)
    expect(cashier.shifts.some(({ id }) => id === "shift-other")).toBe(false)
    expect(cashier.shifts.some(({ cashierId }) => cashierId === "u-cashier")).toBe(true)
    const supervisor = await ledgerSnapshot(context.db, { user: { id: "u-manager", role: "manager", shopId: SHOP } })
    expect(supervisor.usedVariantIds.length).toBeGreaterThan(0)
    expect(supervisor.heldCarts).toEqual([])
    expect(supervisor.shifts.some(({ id }) => id === "shift-other")).toBe(true)
    const owner = await ledgerSnapshot(context.db, { user: { id: "u-admin", role: "admin", shopId: null } })
    expect(owner.settings.taxRate).toBe(17.5)
    expect(owner.variants[0].cost).toBeGreaterThan(0)
    const other = await ledgerSnapshot(context.db, { user: { id: "u-x", role: "manager", shopId: "shop-other" } })
    expect(other.products).toEqual([])
  })

  test("resetting sample data puts the shop back to fresh sample data", async () => {
    await resetSampleData({ db: context.db })
    expect(await context.db.collection(C.shifts).countDocuments({ status: "open" })).toBe(0)
    expect(await context.db.collection(C.auditLog).countDocuments()).toBe(0)
    expect((await context.db.collection(C.settings).findOne({ _id: SHOP })).taxEnabled).toBe(false)
    expect(await context.db.collection(C.sales).countDocuments()).toBeGreaterThan(100)
  })
})
