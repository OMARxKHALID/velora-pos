import { describe, expect, test } from "bun:test"
import { hasTestDatabase, useTestDatabase } from "@/test/db"
import { loadDocuments, seedDocuments } from "@/features/sample-data/lib/seed-documents"
import { COLLECTIONS as C } from "@/server/db/collections"
import { newId } from "@/shared/lib/id"
import { recordSale } from "./sales"
import { openShift } from "./shifts"

const SHOP = "shop-shoes"
const SALES_PER_REGISTER = 40

describe.skipIf(!hasTestDatabase)("an Eid-rush of counters selling at once", () => {
  const context = useTestDatabase()
  const as = (id, role = "cashier") => ({ db: context.db, client: context.client, user: { id, role, shopId: SHOP }, shopId: SHOP, approvalSecret: "x".repeat(40) })

  test("3 counters selling concurrently give every sale a unique receipt number and leave stock exactly right", async () => {
    await loadDocuments(context.db, seedDocuments(Date.now()))

    const picked = await context.db.collection(C.stock).find({ shopId: SHOP }).limit(5).toArray()
    await Promise.all(picked.map(({ variantId }) => context.db.collection(C.stock).updateOne({ variantId }, { $set: { quantity: 200 } })))
    const variants = await context.db.collection(C.variants).find({ _id: { $in: picked.map(({ variantId }) => variantId) } }).toArray()

    const registers = [{ _id: "reg-1", code: "SH1-R1" }, { _id: "reg-rush-2", code: "SH1-R2" }, { _id: "reg-rush-3", code: "SH1-R3" }]
    await context.db.collection(C.registers).insertMany(
      registers.slice(1).map(({ _id, code }) => ({ _id, shopId: SHOP, code, name: code, fbrPosId: "", autoPrint: false, copies: 1, drawerOnCash: true, manualDrawer: true, lastReceiptSeq: 0, lastOfflineSeq: 0, lastFbrSeq: 0 }))
    )

    const shifts = await Promise.all(registers.map(({ _id }, index) => openShift(as(`u-rush-${index}`), { openingCash: 0, clientId: newId(), registerId: _id })))

    const jobs = shifts.flatMap((shift, index) =>
      Array.from({ length: SALES_PER_REGISTER }, (_, seq) => {
        const variant = variants[(index + seq) % variants.length]
        return recordSale(as(`u-rush-${index}`), { clientId: newId(), shiftId: shift.id, lines: [{ variantId: variant._id, quantity: 1 }], payments: [{ method: "card", amount: variant.price }] })
      })
    )

    const results = await Promise.allSettled(jobs)
    const failed = results.filter(({ status }) => status === "rejected")
    expect(failed).toEqual([])
    const sales = results.map((result) => result.value)

    for (const shift of shifts) {
      const numbers = sales.filter((sale) => sale.shiftId === shift.id).map(({ number }) => number)
      expect(numbers).toHaveLength(SALES_PER_REGISTER)
      expect(new Set(numbers).size).toBe(SALES_PER_REGISTER)
    }
    expect(new Set(sales.map(({ number }) => number)).size).toBe(shifts.length * SALES_PER_REGISTER)

    for (const variant of variants) {
      const sold = sales.filter((sale) => sale.items[0].variantId === variant._id).length
      const stock = await context.db.collection(C.stock).findOne({ variantId: variant._id })
      expect(stock.quantity).toBe(200 - sold)
    }
  })
})
