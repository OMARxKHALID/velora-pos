import { describe, expect, test } from "bun:test"
import { hasTestDatabase, useTestDatabase } from "@/test/db"
import { openShift } from "@/features/pos/server/shifts"
import { COLLECTIONS as C } from "@/lib/db/collections"
import { newId } from "@/lib/id"
import { ensureFirstShop } from "./first-shop"

describe.skipIf(!hasTestDatabase)("a new install without sample data", () => {
  const context = useTestDatabase()

  test("gets its shop, counter and settings once, and the till can open a shift", async () => {
    expect(await ensureFirstShop(context.db)).toEqual([C.shops, C.registers, C.settings])
    await context.db.collection(C.settings).updateOne({ _id: "shop-shoes" }, { $set: { taxEnabled: true } })
    expect(await ensureFirstShop(context.db)).toEqual([])
    expect(await context.db.collection(C.settings).findOne({ _id: "shop-shoes" })).toMatchObject({ taxEnabled: true })
    const shift = await openShift({ db: context.db, client: context.client, user: { id: "u-first" }, shopId: "shop-shoes" }, { openingCash: 0, clientId: newId() })
    expect(shift).toMatchObject({ registerCode: "SH1-R1", receiptBlocks: [{ from: 1, to: 30 }] })
  })
})
