import { beforeAll, describe, expect, test } from "bun:test"
import { hasTestDatabase, useTestDatabase } from "@/test/db"
import { issueApproval } from "@/features/auth/server/approval-token"
import { loadDocuments, seedDocuments } from "@/features/sample-data/lib/seed-documents"
import { ledgerSnapshot } from "@/features/ledger/server/snapshot"
import { COLLECTIONS as C } from "@/lib/db/collections"
import { newId } from "@/lib/id"
import { OFFLINE_BLOCK, offlineNumbers } from "../lib/receipts"
import { recordSale, syncOfflineSale } from "./sales"
import { closeShift, openShift, reserveReceipts } from "./shifts"

const SHOP = "shop-shoes"
const SECRET = "offline-test-secret-that-is-long-enough"
const MINUTE = 60 * 1000
const pricing = { taxEnabled: false, taxRate: 0, taxLabel: null, productDiscountEnabled: true, cartDiscountEnabled: true }

describe.skipIf(!hasTestDatabase)("sales made offline and uploaded later", () => {
  const context = useTestDatabase()
  const as = (id, now) => ({ db: context.db, client: context.client, user: { id }, shopId: SHOP, approvalSecret: SECRET, ...(now ? { now } : {}) })
  const stockOf = async (variantId) => (await context.db.collection(C.stock).findOne({ variantId }))?.quantity ?? 0
  const pick = async (minimum = 2) => {
    const stock = await context.db.collection(C.stock).findOne({ shopId: SHOP, quantity: { $gte: minimum } }, { sort: { quantity: -1 } })
    return context.db.collection(C.variants).findOne({ _id: stock.variantId })
  }
  let shift
  let numbers
  let used = 0
  const nextNumber = () => numbers[used++]

  const offlineSale = (variant, overrides = {}) => ({
    clientId: newId(),
    shiftId: shift.id,
    number: nextNumber(),
    soldAt: Date.now() - MINUTE,
    lines: [{ variantId: variant._id, quantity: 1, unitPrice: variant.price, productDiscountPct: 0 }],
    payments: [{ method: "card", amount: variant.price }],
    total: variant.price,
    pricing,
    ...overrides,
  })

  beforeAll(async () => {
    await loadDocuments(context.db, seedDocuments(Date.now() - 3 * 24 * 60 * MINUTE))
    await context.db.collection(C.products).updateMany({}, { $set: { discountPct: 0 } })
    await context.db.collection(C.users).insertOne({ _id: "u-manager", role: "manager", banned: false, name: "Bilal Ahmed", email: "bilal@test.invalid" })
    shift = await openShift(as("u-cashier"), { openingCash: 0, clientId: newId() })
    numbers = offlineNumbers(shift.registerCode, shift.receiptBlocks)
  })

  test("opening a shift sets aside a block of offline receipt numbers, and the till can ask for more", async () => {
    expect(shift.registerCode).toBe("SH1-R1")
    expect(shift.receiptBlocks).toEqual([{ from: 1, to: OFFLINE_BLOCK }])
    expect(numbers[0]).toBe("SH1-R1-X00001")
    const topped = await reserveReceipts(as("u-cashier"), { shiftId: shift.id })
    expect(topped.receiptBlocks).toEqual([
      { from: 1, to: OFFLINE_BLOCK },
      { from: OFFLINE_BLOCK + 1, to: OFFLINE_BLOCK * 2 },
    ])
    await expect(reserveReceipts(as("u-cashier-2"), { shiftId: shift.id })).rejects.toThrow("another cashier")
    numbers = offlineNumbers(topped.registerCode, topped.receiptBlocks)
    shift = topped
  })

  test("an offline sale keeps its receipt number and time, takes the stock, and uploads only once", async () => {
    const variant = await pick()
    const before = await stockOf(variant._id)
    const input = offlineSale(variant)
    const results = await Promise.all([syncOfflineSale(as("u-cashier"), input), syncOfflineSale(as("u-cashier"), input)])
    expect(new Set(results.map(({ id }) => id)).size).toBe(1)
    expect(results[0]).toMatchObject({ number: input.number, offline: true, flags: [], total: variant.price })
    expect(results[0].soldAt.getTime()).toBe(input.soldAt)
    expect(await stockOf(variant._id)).toBe(before - 1)
    expect(await context.db.collection(C.sales).countDocuments({ clientId: input.clientId })).toBe(1)
  })

  test("another device on the same shift carries on after the offline numbers the server already has", async () => {
    const { shifts } = await ledgerSnapshot(context.db, { user: { id: "u-cashier", role: "cashier", shopId: SHOP } })
    expect(shifts.find(({ id }) => id === shift.id).offlineNext).toBe(1)
  })

  test("online sales keep their own numbering alongside offline ones", async () => {
    const variant = await pick()
    const sale = await recordSale(as("u-cashier"), { clientId: newId(), shiftId: shift.id, lines: [{ variantId: variant._id, quantity: 1 }], payments: [{ method: "card", amount: variant.price }] })
    expect(sale.number).toMatch(/^SH1-R1-\d{6}$/)
  })

  test("the price the customer paid stands even if it changed since, and the sale is marked for a look", async () => {
    const variant = await pick()
    await context.db.collection(C.variants).updateOne({ _id: variant._id }, { $set: { price: variant.price + 100000 } })
    const sale = await syncOfflineSale(as("u-cashier"), offlineSale(variant))
    expect(sale.total).toBe(variant.price)
    expect(sale.items[0].unitPrice).toBe(variant.price)
    expect(sale.flags).toEqual(["price_mismatch"])
    await context.db.collection(C.variants).updateOne({ _id: variant._id }, { $set: { price: variant.price } })
  })

  test("selling what the server thinks is gone is kept and flagged, not lost", async () => {
    const variant = await pick(1)
    const have = await stockOf(variant._id)
    await context.db.collection(C.stock).updateOne({ variantId: variant._id }, { $set: { quantity: 0 } })
    const sale = await syncOfflineSale(as("u-cashier"), offlineSale(variant))
    expect(sale.flags).toContain("negative_stock")
    expect(await stockOf(variant._id)).toBe(-1)
    await context.db.collection(C.stock).updateOne({ variantId: variant._id }, { $set: { quantity: have } })
  })

  test("an archived shoe sold before it was archived still uploads", async () => {
    const variant = await pick()
    await context.db.collection(C.products).updateOne({ _id: variant.productId }, { $set: { status: "archived" } })
    const sale = await syncOfflineSale(as("u-cashier"), offlineSale(variant))
    expect(sale.flags).toEqual([])
    await context.db.collection(C.products).updateOne({ _id: variant.productId }, { $set: { status: "active" } })
  })

  test("a number that is not this shift's, or already taken, gets a fresh one and keeps the old for reference", async () => {
    const variant = await pick()
    const taken = numbers[0]
    const clash = await syncOfflineSale(as("u-cashier"), offlineSale(variant, { number: taken }))
    expect(clash.number).toMatch(/^SH1-R1-\d{6}$/)
    expect(clash).toMatchObject({ offlineNumber: taken, flags: ["renumbered"] })
    const stranger = await syncOfflineSale(as("u-cashier"), offlineSale(variant, { number: "SH1-R1-X99999" }))
    expect(stranger.flags).toEqual(["renumbered"])
  })

  test("a till clock running ahead is pulled back to the upload time", async () => {
    const variant = await pick()
    const now = new Date()
    const sale = await syncOfflineSale(as("u-cashier", now), offlineSale(variant, { soldAt: now.getTime() + 60 * MINUTE }))
    expect(sale.soldAt.getTime()).toBe(now.getTime())
    expect(sale.flags).toEqual(["clock"])
  })

  test("a big discount needs an approval that was valid when the sale was made", async () => {
    const variant = await pick()
    const soldAt = Date.now() - 4 * MINUTE
    const discounted = variant.price - Math.floor((variant.price * 20) / 10000) * 100
    const input = offlineSale(variant, { soldAt, discountPct: 20, payments: [{ method: "card", amount: discounted }], total: discounted })
    await expect(syncOfflineSale(as("u-cashier"), input)).rejects.toThrow("Supervisor approval needed")
    const stale = issueApproval(SECRET, { cashierId: "u-cashier", supervisorId: "u-manager", discountPct: 20, now: soldAt - 10 * MINUTE })
    await expect(syncOfflineSale(as("u-cashier"), { ...input, approvalToken: stale })).rejects.toThrow("expired")
    const approvalToken = issueApproval(SECRET, { cashierId: "u-cashier", supervisorId: "u-manager", discountPct: 20, now: soldAt - MINUTE })
    const sale = await syncOfflineSale(as("u-cashier"), { ...input, approvalToken })
    expect(sale).toMatchObject({ manualDiscountBy: "u-manager", total: discounted, flags: ["big_discount"] })
  })

  test("only the shift's own cashier can upload its sales", async () => {
    const variant = await pick()
    await expect(syncOfflineSale(as("u-cashier-2"), offlineSale(variant))).rejects.toThrow("another cashier")
    await expect(syncOfflineSale(as("u-cashier"), offlineSale(variant, { lines: [{ variantId: "nope", quantity: 1, unitPrice: 100, productDiscountPct: 0 }] }))).rejects.toThrow("Unknown item")
  })

  test("sales that reach the server after the shift was closed are accepted and marked", async () => {
    const variant = await pick()
    const closed = await closeShift(as("u-cashier"), { shiftId: shift.id, countedCash: 0 })
    const before = await syncOfflineSale(as("u-cashier"), offlineSale(variant, { soldAt: closed.closedAt.getTime() - MINUTE }))
    expect(before.flags).toEqual([])
    const after = await syncOfflineSale(as("u-cashier"), offlineSale(variant, { soldAt: closed.closedAt.getTime() + MINUTE }))
    expect(after.flags).toEqual(["after_close"])
    await expect(reserveReceipts(as("u-cashier"), { shiftId: shift.id })).rejects.toThrow("not open")
  })
})
