import { beforeAll, describe, expect, test } from "bun:test"
import { hasTestDatabase, useTestDatabase } from "@/test/db"
import { loadDocuments, seedDocuments } from "@/features/sample-data/lib/seed-documents"
import { recordSale } from "@/features/pos/server/sales"
import { openShift } from "@/features/pos/server/shifts"
import { requestRefund } from "@/features/refunds/server/service"
import { updateSettings } from "@/features/settings/server/service"
import { COLLECTIONS as C } from "@/server/db/collections"
import { newId } from "@/shared/lib/id"
import { exchangeItem } from "./exchanges"

const SHOP = "shop-shoes"
const FEE = 100

describe.skipIf(!hasTestDatabase)("size exchanges and FBR numbers", () => {
  const context = useTestDatabase()
  const as = (id, role = "cashier") => ({ db: context.db, client: context.client, user: { id, role, shopId: SHOP }, shopId: SHOP, approvalSecret: "x".repeat(40) })
  const stockOf = async (variantId) => (await context.db.collection(C.stock).findOne({ variantId }))?.quantity ?? 0
  let shift
  let sale
  let from
  let to

  beforeAll(async () => {
    await loadDocuments(context.db, seedDocuments(new Date(2026, 8, 16, 18).getTime()))
    await context.db.collection(C.shops).updateOne({ _id: SHOP }, { $set: { ntn: "1234567-8" } })
    await context.db.collection(C.registers).updateMany({ shopId: SHOP }, { $set: { fbrPosId: "110014" } })
    await updateSettings(as("u-admin", "admin"), { fbrEnabled: true })
    shift = await openShift(as("u-cashier"), { openingCash: 0, clientId: newId() })
    const stocked = await context.db.collection(C.stock).find({ shopId: SHOP, quantity: { $gte: 3 } }).toArray()
    for (const row of stocked) {
      const first = await context.db.collection(C.variants).findOne({ _id: row.variantId })
      const sibling = await context.db.collection(C.variants).findOne({ productId: first.productId, _id: { $ne: first._id }, color: { $exists: false } }, { sort: { _id: 1 } })
      const sameColor = sibling && (await context.db.collection(C.stock).findOne({ variantId: sibling._id, quantity: { $gte: 2 } }))
      if (sameColor) {
        from = first
        to = sibling
        break
      }
    }
    sale = await recordSale(as("u-cashier"), { clientId: newId(), shiftId: shift.id, lines: [{ variantId: from._id, quantity: 2 }], payments: [{ method: "card", amount: from.price * 2 + FEE }] })
  })

  test("a sale gets a fiscal number while FBR is on, numbered by the counter", async () => {
    expect(sale.fbr).toMatchObject({ status: "reported", posId: "110014", usin: sale.number, invoiceType: 1 })
    expect(sale.fbr.invoiceNumber).toMatch(/^110014\d{16}$/)
    const second = await recordSale(as("u-cashier"), { clientId: newId(), shiftId: shift.id, lines: [{ variantId: from._id, quantity: 1 }], payments: [{ method: "card", amount: from.price + FEE }] })
    expect(second.fbr.invoiceNumber).not.toBe(sale.fbr.invoiceNumber)
    expect((await context.db.collection(C.registers).findOne({ shopId: SHOP })).lastFbrSeq).toBe(2)
  })

  test("a swap moves stock both ways, books a credit note and a new invoice, and cannot be repeated", async () => {
    const [fromBefore, toBefore] = [await stockOf(from._id), await stockOf(to._id)]
    const request = { clientId: newId(), saleId: sale.id, fromVariantId: from._id, toVariantId: to._id, quantity: 1 }
    const [exchange, again] = await Promise.all([exchangeItem(as("u-cashier"), request), exchangeItem(as("u-cashier"), request)])
    expect(again.id).toBe(exchange.id)
    expect(await stockOf(from._id)).toBe(fromBefore + 1)
    expect(await stockOf(to._id)).toBe(toBefore - 1)
    expect(exchange.fbr.credit).toMatchObject({ invoiceType: 3, status: "reported", refUsin: sale.number })
    expect(exchange.fbr.invoice).toMatchObject({ invoiceType: 1, status: "reported" })
    expect(await context.db.collection(C.movements).countDocuments({ "ref.id": exchange.id, type: "exchange" })).toBe(2)
  })

  test("swapped pairs are no longer refundable, and other cashiers cannot swap this sale", async () => {
    await expect(exchangeItem(as("u-cashier-2"), { clientId: newId(), saleId: sale.id, fromVariantId: from._id, toVariantId: to._id, quantity: 1 })).rejects.toThrow("your own sales")
    await expect(requestRefund(as("u-cashier"), { clientId: newId(), saleId: sale.id, lines: [{ variantId: from._id, quantity: 2 }], reason: "Wrong size", method: "card" })).rejects.toThrow("more than was sold")
    const refund = await requestRefund(as("u-cashier"), { clientId: newId(), saleId: sale.id, lines: [{ variantId: from._id, quantity: 1 }], reason: "Wrong size", method: "card" })
    expect(refund.total).toBe(from.price)
  })
})
