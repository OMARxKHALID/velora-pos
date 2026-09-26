import { beforeAll, describe, expect, test } from "bun:test"
import { hasTestDatabase, useTestDatabase } from "@/test/db"
import { issueApproval } from "@/features/auth/server/approval-token"
import { loadDocuments, seedDocuments } from "@/features/sample-data/lib/seed-documents"
import { COLLECTIONS as C } from "@/lib/db/collections"
import { newId } from "@/lib/id"
import { discardHeldCart, holdCart, takeHeldCart } from "./held-carts"
import { recordSale } from "./sales"
import { closeShift, openShift } from "./shifts"

const SHOP = "shop-shoes"
const SECRET = "pos-test-secret-that-is-long-enough-1"

describe.skipIf(!hasTestDatabase)("selling on the server", () => {
  const context = useTestDatabase()
  const as = (id) => ({ db: context.db, client: context.client, user: { id }, shopId: SHOP, approvalSecret: SECRET })
  const cashier = () => as("u-cashier")
  const stockOf = async (variantId) => (await context.db.collection(C.stock).findOne({ variantId }))?.quantity ?? 0
  const pick = async (minimum = 2) => {
    const stock = await context.db.collection(C.stock).findOne({ shopId: SHOP, quantity: { $gte: minimum } }, { sort: { quantity: -1 } })
    return context.db.collection(C.variants).findOne({ _id: stock.variantId })
  }
  let shift

  beforeAll(async () => {
    await loadDocuments(context.db, seedDocuments(new Date(2026, 8, 16, 18).getTime()))
    await context.db.collection(C.users).insertMany([
      { _id: "u-manager", role: "manager", banned: false, name: "Bilal Ahmed", email: "bilal@test.invalid" },
      { _id: "u-manager-gone", role: "manager", banned: true, name: "Gone", email: "gone@test.invalid" },
    ])
  })

  test("a counter opens one shift; the same tap twice opens it once", async () => {
    const clientId = newId()
    const [first, again] = await Promise.all([openShift(cashier(), { openingCash: 1000000, clientId }), openShift(cashier(), { openingCash: 1000000, clientId })])
    expect(again.id).toBe(first.id)
    await expect(openShift(as("u-cashier-2"), { openingCash: 0, clientId: newId() })).rejects.toThrow("already open")
    await expect(openShift(cashier(), { openingCash: -1, clientId: newId() })).rejects.toThrow("negative")
    expect(await context.db.collection(C.shifts).countDocuments({ status: "open" })).toBe(1)
    shift = first
  })

  test("the server prices the sale itself, takes the stock and numbers the receipt", async () => {
    const variant = await pick()
    const before = await stockOf(variant._id)
    const lastSeq = (await context.db.collection(C.registers).findOne({ _id: "reg-1" })).lastReceiptSeq
    const sale = await recordSale(cashier(), { clientId: newId(), shiftId: shift.id, lines: [{ variantId: variant._id, quantity: 1, price: 1 }], payments: [{ method: "cash", amount: variant.price + 50000 }] })
    expect(sale).toMatchObject({ number: `SH1-R1-${String(lastSeq + 1).padStart(6, "0")}`, subtotal: variant.price, total: variant.price, change: 50000, cashierId: "u-cashier", flags: [] })
    expect(sale.items[0]).toMatchObject({ unitPrice: variant.price, unitCost: variant.cost })
    expect(await stockOf(variant._id)).toBe(before - 1)
    const movement = await context.db.collection(C.movements).findOne({ "ref.id": sale.id })
    expect(movement).toMatchObject({ type: "sale", quantity: -1, balanceAfter: before - 1, ref: { number: sale.number } })
    await expect(recordSale(cashier(), { clientId: newId(), shiftId: shift.id, lines: [{ variantId: variant._id, quantity: 1 }], payments: [{ method: "cash", amount: variant.price - 100 }] })).rejects.toThrow("Payment is short")
    await expect(recordSale(cashier(), { clientId: newId(), shiftId: shift.id, lines: [{ variantId: variant._id, quantity: 1 }], payments: [{ method: "card", amount: variant.price + 100 }] })).rejects.toThrow("Change can only be given from cash")
  })

  test("pressing Pay twice, even at the same moment, sells once", async () => {
    const variant = await pick()
    const before = await stockOf(variant._id)
    const request = { clientId: newId(), shiftId: shift.id, lines: [{ variantId: variant._id, quantity: 1 }], payments: [{ method: "card", amount: variant.price }] }
    const results = await Promise.all([recordSale(cashier(), request), recordSale(cashier(), request), recordSale(cashier(), request)])
    expect(new Set(results.map(({ id }) => id)).size).toBe(1)
    expect(await context.db.collection(C.sales).countDocuments({ clientId: request.clientId })).toBe(1)
    expect(await stockOf(variant._id)).toBe(before - 1)
  })

  test("two counters selling the last pair at once: one sale goes through", async () => {
    await context.db.collection(C.registers).insertOne({ _id: "reg-2", shopId: SHOP, code: "SH1-R2", lastReceiptSeq: 0 })
    const second = await openShift(as("u-cashier-2"), { openingCash: 0, clientId: newId(), registerId: "reg-2" })
    const variant = await pick(1)
    const have = await stockOf(variant._id)
    await context.db.collection(C.stock).updateOne({ variantId: variant._id }, { $set: { quantity: 1 } })
    const sell = (who, shiftId) => recordSale(as(who), { clientId: newId(), shiftId, lines: [{ variantId: variant._id, quantity: 1 }], payments: [{ method: "card", amount: variant.price }] })
    const results = await Promise.allSettled([sell("u-cashier", shift.id), sell("u-cashier-2", second.id)])
    expect(results.filter(({ status }) => status === "fulfilled")).toHaveLength(1)
    expect(results.find(({ status }) => status === "rejected").reason.message).toMatch(/Only 0 left/)
    expect(await stockOf(variant._id)).toBe(0)
    await context.db.collection(C.stock).updateOne({ variantId: variant._id }, { $set: { quantity: have } })
    await closeShift(as("u-cashier-2"), { shiftId: second.id, countedCash: 0 })
  })

  test("a sale must go to the seller's own open shift", async () => {
    const variant = await pick()
    const line = { lines: [{ variantId: variant._id, quantity: 1 }], payments: [{ method: "card", amount: variant.price }] }
    await expect(recordSale(as("u-cashier-2"), { ...line, clientId: newId(), shiftId: shift.id })).rejects.toThrow("another cashier")
    const closed = await context.db.collection(C.shifts).findOne({ status: "closed" })
    await expect(recordSale(cashier(), { ...line, clientId: newId(), shiftId: closed._id })).rejects.toThrow("Open a shift")
    await expect(recordSale({ ...cashier(), shopId: "shop-other" }, { ...line, clientId: newId(), shiftId: shift.id })).rejects.toThrow("Open a shift")
    await expect(recordSale(cashier(), { ...line, clientId: newId(), shiftId: shift.id, lines: [{ variantId: "nope", quantity: 1 }] })).rejects.toThrow("Unknown item")
  })

  test("a big discount needs a live approval for this cashier and this discount", async () => {
    const variant = await pick()
    const sell = (extra) => recordSale(cashier(), { clientId: newId(), shiftId: shift.id, lines: [{ variantId: variant._id, quantity: 1 }], payments: [{ method: "cash", amount: variant.price }], ...extra })
    await expect(sell({ discountPct: 10 })).rejects.toThrow("Supervisor approval needed")
    const token = (overrides = {}) => issueApproval(SECRET, { cashierId: "u-cashier", supervisorId: "u-manager", discountPct: 10, ...overrides })
    await expect(sell({ discountPct: 15, approvalToken: token() })).rejects.toThrow("does not match")
    await expect(sell({ discountPct: 10, approvalToken: token({ cashierId: "u-cashier-2" }) })).rejects.toThrow("does not match")
    await expect(sell({ discountPct: 10, approvalToken: token({ now: Date.now() - 10 * 60 * 1000 }) })).rejects.toThrow("expired")
    await expect(sell({ discountPct: 10, approvalToken: token({ supervisorId: "u-manager-gone" }) })).rejects.toThrow("no longer active")
    await expect(sell({ discountPct: 10, approvalToken: issueApproval("wrong-secret-that-is-long-enough-123", { cashierId: "u-cashier", supervisorId: "u-manager", discountPct: 10 }) })).rejects.toThrow("expired")

    const approvalToken = token()
    const sale = await sell({ discountPct: 10, approvalToken })
    expect(sale).toMatchObject({ manualDiscountBy: "u-manager", flags: ["big_discount"] })
    await expect(sell({ discountPct: 10, approvalToken })).rejects.toThrow("already used")
    expect(sale.cartDiscount).toBe(Math.floor((variant.price * 10) / 10000) * 100)
    const small = await sell({ discountPct: 5 })
    expect(small.manualDiscountBy).toBeNull()
  })

  test("tax and customer details follow the shop settings", async () => {
    await context.db.collection(C.settings).updateOne({ _id: SHOP }, { $set: { taxEnabled: true, taxRate: 15, taxLabel: "GST", customerInfoEnabled: false } })
    const variant = await pick()
    const tax = Math.round((variant.price * 0.15) / 100) * 100
    const sale = await recordSale(cashier(), { clientId: newId(), shiftId: shift.id, lines: [{ variantId: variant._id, quantity: 1 }], payments: [{ method: "card", amount: variant.price + tax }], customerName: "Sana" })
    expect(sale).toMatchObject({ taxTotal: tax, taxLabel: "GST", total: variant.price + tax })
    expect(sale.customerName).toBeUndefined()
    await context.db.collection(C.settings).updateOne({ _id: SHOP }, { $set: { taxEnabled: false, taxRate: 0, customerInfoEnabled: true } })
  })

  test("wallet and bank payments need a transaction ID, and a split sale with a blank card slip goes through", async () => {
    const variant = await pick()
    const lines = [{ variantId: variant._id, quantity: 1 }]
    const wallet = (reference) => ({ clientId: newId(), shiftId: shift.id, lines, payments: [{ method: "jazzcash", amount: variant.price, ...(reference && { reference }) }] })
    await expect(recordSale(cashier(), wallet())).rejects.toThrow("transaction ID")
    const paid = await recordSale(cashier(), wallet("TX9"))
    expect(paid.payments[0]).toMatchObject({ method: "jazzcash", reference: "TX9" })
    const split = await recordSale(cashier(), { clientId: newId(), shiftId: shift.id, lines, payments: [{ method: "cash", amount: 100000 }, { method: "card", amount: variant.price - 100000, reference: null }] })
    expect(split.payments).toHaveLength(2)
  })

  test("prices that include tax and cash rounding follow the shop settings", async () => {
    await context.db.collection(C.settings).updateOne({ _id: SHOP }, { $set: { taxEnabled: true, taxRate: 18, pricesIncludeTax: true, cashRounding: 10 } })
    const variant = await pick()
    const sale = await recordSale(cashier(), { clientId: newId(), shiftId: shift.id, lines: [{ variantId: variant._id, quantity: 1 }], payments: [{ method: "cash", amount: variant.price + 500000 }] })
    expect(sale).toMatchObject({ taxInclusive: true, total: variant.price, taxTotal: Math.round((variant.price * 18) / 118 / 100) * 100, cashRounding: -(variant.price % 1000) })
    expect(sale.items[0].saleValue + sale.items[0].taxCharged).toBe(variant.price)
    expect(sale.change).toBe(variant.price + 500000 - (variant.price + sale.cashRounding))
    await context.db.collection(C.settings).updateOne({ _id: SHOP }, { $set: { taxEnabled: false, taxRate: 0, pricesIncludeTax: false, cashRounding: 1 } })
  })

  test("a held cart is shared by the counter and can be resumed only once", async () => {
    const variant = await pick()
    const held = await holdCart(cashier(), { cart: { lines: [{ variantId: variant._id, quantity: 2 }], customerName: "Sana" } })
    expect(held).toMatchObject({ label: "Sana", registerId: "reg-1" })
    expect(await context.db.collection(C.heldCarts).countDocuments({ _id: held.id, registerId: "reg-1" })).toBe(1)
    const results = await Promise.allSettled([takeHeldCart(cashier(), held.id), takeHeldCart(as("u-cashier-2"), held.id)])
    expect(results.filter(({ status }) => status === "fulfilled")).toHaveLength(1)
    await expect(holdCart(cashier(), { cart: { lines: [] } })).rejects.toThrow("empty")
    await expect(holdCart(cashier(), { cart: { lines: [{ variantId: "nope", quantity: 1 }] } })).rejects.toThrow("Unknown item")
    const other = await holdCart(cashier(), { cart: { lines: [{ variantId: variant._id, quantity: 1 }] } })
    await discardHeldCart(cashier(), other.id)
    await expect(takeHeldCart(cashier(), other.id)).rejects.toThrow("already resumed")
  })

  test("closing freezes the Z-report; the drawer count uses what the server recorded", async () => {
    const sales = await context.db.collection(C.sales).find({ shiftId: shift.id }).toArray()
    const cashIn = sales.reduce((sum, sale) => sum + sale.payments.filter(({ method }) => method === "cash").reduce((total, { amount }) => total + amount, 0) - sale.change, 0)
    const closed = await closeShift(as("u-cashier-2"), { shiftId: shift.id, countedCash: 1000000 + cashIn - 50000, note: "Counted twice" })
    expect(closed).toMatchObject({ status: "closed", closedBy: "u-cashier-2", expectedCash: 1000000 + cashIn, difference: -50000, closeNote: "Counted twice" })
    expect(closed.summary).toMatchObject({ saleCount: sales.length, cashSales: cashIn })
    await expect(closeShift(cashier(), { shiftId: shift.id, countedCash: 0 })).rejects.toThrow("not open")
    const variant = await pick()
    await expect(recordSale(cashier(), { clientId: newId(), shiftId: shift.id, lines: [{ variantId: variant._id, quantity: 1 }], payments: [{ method: "card", amount: variant.price }] })).rejects.toThrow("Open a shift")
  })
})
