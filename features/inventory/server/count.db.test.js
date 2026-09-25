import { beforeAll, describe, expect, test } from "bun:test"
import { hasTestDatabase, useTestDatabase } from "@/test/db"
import { loadDocuments, seedDocuments } from "@/features/sample-data/lib/seed-documents"
import { closeShift, openShift } from "@/features/pos/server/shifts"
import { openDrawer } from "@/features/pos/server/drawer"
import { COLLECTIONS as C } from "@/lib/db/collections"
import { newId } from "@/lib/id"
import { countStock } from "./count"

const SHOP = "shop-shoes"

describe.skipIf(!hasTestDatabase)("stock counts and the drawer", () => {
  const context = useTestDatabase()
  const as = (id, role) => ({ db: context.db, client: context.client, user: { id, role, shopId: SHOP }, shopId: SHOP })
  const stockOf = async (variantId) => (await context.db.collection(C.stock).findOne({ variantId }))?.quantity ?? 0
  let variants

  beforeAll(async () => {
    await loadDocuments(context.db, seedDocuments(new Date(2026, 8, 16, 18).getTime()))
    variants = (await context.db.collection(C.stock).find({ shopId: SHOP, quantity: { $gte: 3 } }).limit(2).toArray()).map(({ variantId, quantity }) => ({ variantId, quantity }))
  })

  test("a count books only the differences, as count adjustments", async () => {
    const [a, b] = variants
    const record = await countStock(as("u-manager", "manager"), { counts: [{ variantId: a.variantId, counted: a.quantity - 2 }, { variantId: b.variantId, counted: b.quantity }] })
    expect(record.changed).toBe(1)
    expect(await stockOf(a.variantId)).toBe(a.quantity - 2)
    expect(await stockOf(b.variantId)).toBe(b.quantity)
    expect(await context.db.collection(C.movements).findOne({ "ref.id": record.id })).toMatchObject({ type: "adjustment", reason: "count", quantity: -2, variantId: a.variantId })
    expect(await context.db.collection(C.movements).countDocuments({ "ref.id": record.id })).toBe(1)
  })

  test("counts are checked before anything is booked", async () => {
    const [a] = variants
    await expect(countStock(as("u-manager", "manager"), { counts: [] })).rejects.toThrow("Scan at least one")
    await expect(countStock(as("u-manager", "manager"), { counts: [{ variantId: a.variantId, counted: 1.5 }] })).rejects.toThrow("whole numbers")
    await expect(countStock(as("u-manager", "manager"), { counts: [{ variantId: "nope", counted: 1 }] })).rejects.toThrow("Unknown item")
    await expect(countStock(as("u-manager", "manager"), { counts: [{ variantId: a.variantId, counted: 1 }, { variantId: a.variantId, counted: 2 }] })).rejects.toThrow("only be counted once")
  })

  test("no-sale drawer opens need a note, follow the counter's rule and show on the Z-report", async () => {
    const shift = await openShift(as("u-cashier", "cashier"), { openingCash: 0, clientId: newId() })
    await expect(openDrawer(as("u-cashier", "cashier"), { registerId: shift.registerId, shiftId: shift.id, reason: "no-sale", note: " " })).rejects.toThrow("Say why")
    await openDrawer(as("u-cashier", "cashier"), { registerId: shift.registerId, shiftId: shift.id, reason: "no-sale", note: "Change for Rs 5000" })
    await context.db.collection(C.registers).updateOne({ _id: shift.registerId }, { $set: { manualDrawer: false } })
    await expect(openDrawer(as("u-cashier", "cashier"), { registerId: shift.registerId, shiftId: shift.id, reason: "no-sale", note: "again" })).rejects.toThrow("doesn't allow")
    const closed = await closeShift(as("u-cashier", "cashier"), { shiftId: shift.id, countedCash: 0 })
    expect(closed.summary.noSaleOpens).toBe(1)
  })
})
