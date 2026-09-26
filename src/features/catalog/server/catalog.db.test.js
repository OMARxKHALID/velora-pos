import { beforeAll, describe, expect, test } from "bun:test"
import { hasTestDatabase, useTestDatabase } from "@/test/db"
import { loadDocuments, seedDocuments } from "@/features/sample-data/lib/seed-documents"
import { adjustStock, receiveDelivery } from "@/features/inventory/server/service"
import { COLLECTIONS as C } from "@/server/db/collections"
import { movementsPage } from "./queries"
import { deleteProduct, importCatalog, saveProduct, setProductStatus } from "./service"

const SHOP = "shop-shoes"
const input = { productType: "footwear", name: "Crest Runner", brand: "Velora", category: "Sneakers", audience: "men", price: 1350000, cost: 600000, colors: ["Black", "White"], sizes: ["42", "41"] }

describe.skipIf(!hasTestDatabase)("products and stock on the server", () => {
  const context = useTestDatabase()
  const deps = () => ({ db: context.db, client: context.client, user: { id: "u-manager" }, shopId: SHOP })
  const stockOf = async (variantId) => (await context.db.collection(C.stock).findOne({ variantId }))?.quantity ?? 0
  const latestAudit = (target) => context.db.collection(C.auditLog).findOne({ shopId: SHOP, target }, { sort: { at: -1, _id: -1 } })
  const historyOf = (variantId) => context.db.collection(C.movements).find({ variantId }, { sort: { createdAt: 1, _id: 1 } }).toArray()

  beforeAll(async () => {
    await loadDocuments(context.db, seedDocuments(new Date(2026, 8, 16, 18).getTime()))
  })

  test("a new product gets one item per colour and size, fresh barcodes, labels, opening stock and an audit entry", async () => {
    const saved = await saveProduct(deps(), { input, openingStock: (id) => [{ variantId: `${id}-BLACK-42`, quantity: 4 }] })
    expect(saved).toMatchObject({ id: "p-25", created: true, variants: 4, pairs: 4 })
    const variants = await context.db.collection(C.variants).find({ productId: "p-25" }).toArray()
    expect(variants.map(({ _id }) => _id).toSorted()).toEqual(["p-25-BLACK-41", "p-25-BLACK-42", "p-25-WHITE-41", "p-25-WHITE-42"])
    expect(new Set(variants.map(({ barcode }) => barcode)).size).toBe(4)
    expect(variants.find(({ _id }) => _id === "p-25-BLACK-42")).toMatchObject({ label: "Black · EU 42", shopId: SHOP, price: 1350000 })
    expect(await stockOf("p-25-BLACK-42")).toBe(4)
    expect(await latestAudit("p-25")).toMatchObject({ kind: "product.create", userId: "u-manager" })
  })

  test("names are unique per shop regardless of case, even when two people save at once", async () => {
    await expect(saveProduct(deps(), { input: { ...input, name: "CREST RUNNER" } })).rejects.toThrow("already exists")
    const race = await Promise.allSettled([saveProduct(deps(), { input: { ...input, name: "Twin Shoe" } }), saveProduct(deps(), { input: { ...input, name: "twin shoe" } })])
    expect(race.map(({ status }) => status).toSorted()).toEqual(["fulfilled", "rejected"])
    expect(race.find(({ status }) => status === "rejected").reason.message).toMatch("already exists")
    expect(await context.db.collection(C.products).countDocuments({ name: /^twin shoe$/i })).toBe(1)
  })

  test("a barcode belongs to one item, and a bad save changes nothing", async () => {
    const taken = (await context.db.collection(C.variants).findOne({ productId: "p-01" })).barcode
    const before = await context.db.collection(C.products).countDocuments()
    await expect(saveProduct(deps(), { input: { ...input, name: "Barcode Clash" }, barcodes: (id) => ({ [`${id}-BLACK-41`]: taken }) })).rejects.toThrow("already belongs")
    expect(await context.db.collection(C.products).countDocuments()).toBe(before)
    const race = await Promise.allSettled([
      saveProduct(deps(), { input: { ...input, name: "Race A" }, barcodes: (id) => ({ [`${id}-BLACK-41`]: "8900000000017" }) }),
      saveProduct(deps(), { input: { ...input, name: "Race B" }, barcodes: (id) => ({ [`${id}-BLACK-41`]: "8900000000017" }) }),
    ])
    expect(race.filter(({ status }) => status === "fulfilled")).toHaveLength(1)
    expect(await context.db.collection(C.variants).countDocuments({ barcode: "8900000000017" })).toBe(1)
  })

  test("editing records what changed, retires sold sizes and deletes unsold ones", async () => {
    await saveProduct(deps(), { productId: "p-25", input: { ...input, price: 1450000, sizes: ["41"] } })
    const variants = Object.fromEntries((await context.db.collection(C.variants).find({ productId: "p-25" }).toArray()).map((doc) => [doc._id, doc]))
    expect(variants["p-25-BLACK-42"].active).toBe(false)
    expect(variants["p-25-WHITE-42"]).toBeUndefined()
    expect(variants["p-25-BLACK-41"]).toMatchObject({ active: true, price: 1450000 })
    const latest = await latestAudit("p-25")
    expect(latest).toMatchObject({ kind: "product.update", changes: { price: { from: 1350000, to: 1450000 } } })
    await expect(deleteProduct(deps(), { productId: "p-25" })).rejects.toThrow("Archive it instead")
    await setProductStatus(deps(), { productId: "p-25", status: "archived" })
    expect((await latestAudit("p-25")).changes).toEqual({ status: { from: "active", to: "archived" } })
  })

  test("another shop's items are out of reach", async () => {
    await expect(saveProduct({ ...deps(), shopId: "shop-other" }, { productId: "p-01", input })).rejects.toThrow("Product not found")
    await expect(receiveDelivery({ ...deps(), shopId: "shop-other" }, { supplier: "Test", lines: [{ variantId: "p-01-BLACK-GOLD-39", quantity: 1 }] })).rejects.toThrow("Unknown item")
  })

  test("deliveries and adjustments keep an exact running balance", async () => {
    const variantId = "p-02-BLACK-40"
    const start = await stockOf(variantId)
    await receiveDelivery(deps(), { supplier: "Velora Warehouse", lines: [{ variantId, quantity: 5 }] })
    await adjustStock(deps(), { variantId, quantity: -2, reason: "damaged", note: "Scuffed" })
    await expect(adjustStock(deps(), { variantId, quantity: -1000, reason: "lost" })).rejects.toThrow(/Not enough stock|Between 1 and 500/)
    await expect(adjustStock(deps(), { variantId, quantity: 2, reason: "damaged" })).rejects.toThrow("Pick a reason")
    await expect(receiveDelivery(deps(), { supplier: "X", lines: [{ variantId, quantity: 1.5 }] })).rejects.toThrow()
    expect(await stockOf(variantId)).toBe(start + 3)

    const history = await historyOf(variantId)
    let balance = 0
    for (const { quantity, balanceAfter } of history) {
      balance += quantity
      expect(balanceAfter).toBe(balance)
    }
    expect(balance).toBe(start + 3)
  })

  test("two people taking the last pair at once: only one succeeds", async () => {
    const variantId = "p-03-TAN-40"
    const have = await stockOf(variantId)
    if (have > 1) await adjustStock(deps(), { variantId, quantity: -(have - 1), reason: "count" })
    if (have < 1) await receiveDelivery(deps(), { supplier: "Top up", lines: [{ variantId, quantity: 1 - have }] })
    const results = await Promise.allSettled([1, 2, 3].map(() => adjustStock(deps(), { variantId, quantity: -1, reason: "lost" })))
    expect(results.filter(({ status }) => status === "fulfilled")).toHaveLength(1)
    expect(await stockOf(variantId)).toBe(0)
  })

  test("a delivery with one bad line saves nothing", async () => {
    const before = await context.db.collection(C.purchases).countDocuments()
    const stockBefore = await stockOf("p-04-BLACK-40")
    await expect(receiveDelivery(deps(), { supplier: "Mixed", lines: [{ variantId: "p-04-BLACK-40", quantity: 3 }, { variantId: "nope", quantity: 1 }] })).rejects.toThrow("Unknown item")
    expect(await context.db.collection(C.purchases).countDocuments()).toBe(before)
    expect(await stockOf("p-04-BLACK-40")).toBe(stockBefore)
  })

  test("CSV import creates and merges products in one go, matching colours regardless of case", async () => {
    const rows = [
      { product: "Import Boot", brand: "Velora", category: "Boots", audience: "men", color: "Black", size: "42", price: 900000, cost: 400000, barcode: "", stock: 3 },
      { product: "Import Boot", brand: "Velora", category: "Boots", audience: "men", color: "Black", size: "43", price: 900000, cost: 400000, barcode: "8901234567890", stock: 0 },
      { product: "Velora Noir Oxford", brand: "Velora", category: "Formal", audience: "men", color: "black", size: "46", price: 1890000, cost: 850500, barcode: "", stock: 2 },
    ]
    expect(await importCatalog(deps(), { rows })).toEqual({ created: 1, updated: 1, pairs: 5 })
    const oxford = await context.db.collection(C.products).findOne({ name: "Velora Noir Oxford" })
    expect(oxford.colors).toEqual(["Black", "Brown"])
    expect(await stockOf(`${oxford._id}-BLACK-46`)).toBe(2)
    expect(await context.db.collection(C.variants).findOne({ barcode: "8901234567890" })).toMatchObject({ attributes: { size: "43" } })

    const before = await context.db.collection(C.products).countDocuments()
    await expect(importCatalog(deps(), { rows: [{ ...rows[0], product: "Never Saved" }, { ...rows[1], product: "Never Saved Too", barcode: "8901234567890" }] })).rejects.toThrow()
    expect(await context.db.collection(C.products).countDocuments()).toBe(before)
    await expect(importCatalog(deps(), { rows: [rows[0], { ...rows[1], price: "free" }] })).rejects.toThrow("Row 2: price is not valid")
    await expect(importCatalog(deps(), { rows: [{ ...rows[0], product: null }] })).rejects.toThrow("Row 1: product is not valid")
  })

  test("stock history pages newest first", async () => {
    const first = await movementsPage(context.db, { shopId: SHOP, page: 1, pageSize: 10 })
    const second = await movementsPage(context.db, { shopId: SHOP, page: 2, pageSize: 10 })
    expect(first.rows).toHaveLength(10)
    expect(first.total).toBe(await context.db.collection(C.movements).countDocuments({ shopId: SHOP }))
    expect(new Date(first.rows[9].createdAt).getTime()).toBeGreaterThanOrEqual(new Date(second.rows[0].createdAt).getTime())
    expect(first.rows[0]).toMatchObject({ label: expect.any(String), productName: expect.any(String) })
    expect((await movementsPage(context.db, { shopId: SHOP, type: "adjustment" })).rows.every(({ type }) => type === "adjustment")).toBe(true)
  })
})
