import { describe, expect, test } from "bun:test"
import { hasTestDatabase, useTestDatabase } from "@/test/db"
import { COLLECTIONS as C } from "./collections"
import { INDEXES } from "./indexes"
import { isDuplicateKey, withTransaction } from "./transaction"

describe.skipIf(!hasTestDatabase)("database rules", () => {
  const context = useTestDatabase()

  test("every index is created", async () => {
    for (const [collection, indexes] of Object.entries(INDEXES)) {
      const names = (await context.db.collection(collection).indexes()).map(({ name }) => name)
      expect(names).toEqual(expect.arrayContaining(indexes.map(({ name }) => name)))
    }
  })

  test("the same checkout cannot be stored twice", async () => {
    const sales = context.db.collection(C.sales)
    await sales.insertOne({ _id: "s1", clientId: "checkout-1", registerId: "reg-1", number: "R-1" })
    const error = await sales.insertOne({ _id: "s2", clientId: "checkout-1", registerId: "reg-1", number: "R-2" }).catch((failure) => failure)
    expect(isDuplicateKey(error)).toBe(true)
  })

  test("a receipt number is used once per counter", async () => {
    const sales = context.db.collection(C.sales)
    await sales.insertOne({ _id: "s3", clientId: "c3", registerId: "reg-9", number: "R-9" })
    await expect(sales.insertOne({ _id: "s4", clientId: "c4", registerId: "reg-9", number: "R-9" })).rejects.toMatchObject({ code: 11000 })
    await sales.insertOne({ _id: "s5", clientId: "c5", registerId: "reg-10", number: "R-9" })
  })

  test("a counter can only have one open shift", async () => {
    const shifts = context.db.collection(C.shifts)
    await shifts.insertOne({ _id: "sh1", clientId: "o1", registerId: "reg-1", status: "open" })
    await expect(shifts.insertOne({ _id: "sh2", clientId: "o2", registerId: "reg-1", status: "open" })).rejects.toMatchObject({ code: 11000 })
    await shifts.updateOne({ _id: "sh1" }, { $set: { status: "closed" } })
    await shifts.insertOne({ _id: "sh3", clientId: "o3", registerId: "reg-1", status: "open" })
    await shifts.insertOne({ _id: "sh4", clientId: "o4", registerId: "reg-1", status: "closed" })
  })

  test("product names are unique per shop regardless of case, barcodes are unique everywhere", async () => {
    const products = context.db.collection(C.products)
    await products.insertOne({ _id: "p1", shopId: "shop-a", brand: "Nike", name: "Air Max" })
    await expect(products.insertOne({ _id: "p2", shopId: "shop-a", brand: "nike", name: "AIR MAX" })).rejects.toMatchObject({ code: 11000 })
    await products.insertOne({ _id: "p3", shopId: "shop-b", brand: "Nike", name: "Air Max" })
    const variants = context.db.collection(C.variants)
    await variants.insertOne({ _id: "v1", shopId: "shop-a", sku: "A-1", barcode: "2000000000011" })
    await expect(variants.insertOne({ _id: "v2", shopId: "shop-b", sku: "B-1", barcode: "2000000000011" })).rejects.toMatchObject({ code: 11000 })
  })

  test("a transaction saves everything or nothing", async () => {
    const stock = context.db.collection(C.stock)
    await stock.insertOne({ _id: "shop-a:v1", shopId: "shop-a", variantId: "v1", quantity: 1 })

    const failed = await withTransaction(context.client, async (session) => {
      await stock.updateOne({ _id: "shop-a:v1" }, { $inc: { quantity: -1 } }, { session })
      await context.db.collection(C.sales).insertOne({ _id: "t1", clientId: "checkout-1", registerId: "reg-x", number: "X-1" }, { session })
    }).catch((error) => error)

    expect(isDuplicateKey(failed)).toBe(true)
    expect((await stock.findOne({ _id: "shop-a:v1" })).quantity).toBe(1)

    await withTransaction(context.client, async (session) => {
      await stock.updateOne({ _id: "shop-a:v1" }, { $inc: { quantity: -1 } }, { session })
      await context.db.collection(C.sales).insertOne({ _id: "t2", clientId: "checkout-t2", registerId: "reg-x", number: "X-2" }, { session })
    })
    expect((await stock.findOne({ _id: "shop-a:v1" })).quantity).toBe(0)
  })

  test("stock can be taken only while enough is left", async () => {
    const stock = context.db.collection(C.stock)
    await stock.insertOne({ _id: "shop-a:last", shopId: "shop-a", variantId: "last", quantity: 1 })
    const take = () => stock.updateOne({ _id: "shop-a:last", quantity: { $gte: 1 } }, { $inc: { quantity: -1 } })
    const results = await Promise.all([take(), take(), take()])
    expect(results.map(({ modifiedCount }) => modifiedCount).toSorted()).toEqual([0, 0, 1])
    expect((await stock.findOne({ _id: "shop-a:last" })).quantity).toBe(0)
  })
})
