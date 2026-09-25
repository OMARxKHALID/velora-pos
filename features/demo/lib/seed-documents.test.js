import { describe, expect, test } from "bun:test"
import { hasTestDatabase, useTestDatabase } from "@/test/db"
import { COLLECTIONS as C } from "@/lib/db/collections"
import { dropCollections, loadDocuments, seedDocuments } from "./seed-documents"

const documents = seedDocuments(new Date(2026, 8, 16, 18).getTime())

describe("demo data as database documents", () => {
  test("one footwear shop with its counter, and every record keyed by its id", () => {
    expect(documents[C.shops]).toEqual([expect.objectContaining({ _id: "shop-shoes", type: "footwear" })])
    expect(documents[C.registers][0]).toMatchObject({ _id: "reg-1", shopId: "shop-shoes", lastReceiptSeq: documents[C.sales].length })
    for (const name of [C.products, C.variants, C.sales, C.refunds, C.shifts, C.purchases, C.movements]) {
      expect(documents[name].every((doc) => typeof doc._id === "string" && !("id" in doc))).toBe(true)
    }
    expect(documents[C.variants].every(({ shopId }) => shopId === "shop-shoes")).toBe(true)
    expect(documents[C.shifts].filter(({ status }) => status === "closed").every(({ summary }) => summary)).toBe(true)
  })

  test("stock documents add up to the stock history", () => {
    const fromMovements = {}
    for (const { variantId, quantity } of documents[C.movements]) fromMovements[variantId] = (fromMovements[variantId] ?? 0) + quantity
    for (const { variantId, quantity } of documents[C.stock]) expect(quantity).toBe(fromMovements[variantId])
  })
})

describe.skipIf(!hasTestDatabase)("seeding a database", () => {
  const context = useTestDatabase()

  test("loads every document and passes every unique index, and can be reset", async () => {
    const inserted = await loadDocuments(context.db, documents)
    for (const [collection, count] of Object.entries(inserted)) {
      expect(await context.db.collection(collection).countDocuments()).toBe(count)
    }
    await expect(loadDocuments(context.db, { [C.sales]: documents[C.sales].slice(0, 1) })).rejects.toMatchObject({ code: 11000 })
    await dropCollections(context.db)
    expect(await context.db.collection(C.sales).countDocuments()).toBe(0)
  })
})
