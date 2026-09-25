import { beforeAll, describe, expect, test } from "bun:test"
import { hasTestDatabase, useTestDatabase } from "@/test/db"
import { loadDocuments, seedDocuments } from "@/features/sample-data/lib/seed-documents"
import { COLLECTIONS as C } from "@/lib/db/collections"
import { deleteCategory, saveCategory } from "./categories"
import { importCatalog, saveProduct } from "./service"

const SHOP = "shop-shoes"

describe.skipIf(!hasTestDatabase)("categories, sizes and CSV import", () => {
  const context = useTestDatabase()
  const as = () => ({ db: context.db, client: context.client, user: { id: "u-manager", role: "manager", shopId: SHOP }, shopId: SHOP })

  beforeAll(async () => {
    await loadDocuments(context.db, seedDocuments(new Date(2026, 8, 16, 18).getTime()))
  })

  test("a category is added once per name, with a PCT code and its own size set", async () => {
    const socks = await saveCategory(as(), { name: "  Socks ", sizeType: "clothing", icon: "sock", pctCode: "6115.9500", lowStockAt: "5" })
    expect(socks).toMatchObject({ name: "Socks", sizeType: "clothing", pctCode: "6115.9500", lowStockAt: 5 })
    await expect(saveCategory(as(), { name: "socks", sizeType: "one", icon: "tag" })).rejects.toThrow("already exists")
    await expect(saveCategory(as(), { name: "Polish", sizeType: "one", icon: "tag", pctCode: "34" })).rejects.toThrow("PCT code")
    await expect(saveCategory(as(), { name: "Polish", sizeType: "one", icon: "nope" })).rejects.toThrow("icon")
  })

  test("clothing products take letter sizes, and renaming a category renames its products", async () => {
    const [socks] = await context.db.collection(C.categories).find({ shopId: SHOP, name: "Socks" }).toArray()
    const saved = await saveProduct(as(), {
      input: { name: "Crew socks", brand: "Velora", category: "Socks", audience: "unisex", price: 90000, cost: 30000, colors: ["White"], sizes: ["XL", "M"], pctCode: "" },
      openingStock: [{ options: { color: "White", size: "M" }, quantity: 4 }],
    })
    expect(saved).toMatchObject({ created: true, variants: 2, pairs: 4 })
    const variant = await context.db.collection(C.variants).findOne({ productId: saved.id, "attributes.size": "M" })
    expect(variant.label).toBe("White · M")
    await expect(deleteCategory(as(), { categoryId: socks._id })).rejects.toThrow("1 product uses")
    await expect(saveCategory(as(), { categoryId: socks._id, name: "Socks", sizeType: "shoe", icon: "sock" })).rejects.toThrow("sizes")
    await saveCategory(as(), { categoryId: socks._id, name: "Hosiery", sizeType: "clothing", icon: "sock" })
    expect((await context.db.collection(C.products).findOne({ _id: saved.id })).category).toBe("Hosiery")
  })

  test("importing a CSV creates missing categories from the sizes it sees", async () => {
    const result = await importCatalog(as(), {
      rows: [
        { product: "Polish tin", brand: "Kiwi", category: "Polish", audience: "unisex", color: "Black", size: "One size", price: 45000, cost: 20000, barcode: "", stock: 6, pctCode: "3405.1000" },
        { product: "Fleece", brand: "Velora", category: "Jackets", audience: "men", color: "Grey", size: "L", price: 900000, cost: 400000, barcode: "", stock: 2 },
      ],
    })
    expect(result).toMatchObject({ created: 2, pairs: 8 })
    const categories = await context.db.collection(C.categories).find({ shopId: SHOP, name: { $in: ["Polish", "Jackets"] } }).toArray()
    expect(Object.fromEntries(categories.map(({ name, sizeType }) => [name, sizeType]))).toEqual({ Polish: "one", Jackets: "clothing" })
    expect((await context.db.collection(C.products).findOne({ name: "Polish tin" })).pctCode).toBe("3405.1000")
  })

  test("an unused category can be deleted", async () => {
    const extra = await saveCategory(as(), { name: "Laces", sizeType: "one", icon: "tag" })
    await deleteCategory(as(), { categoryId: extra.id })
    expect(await context.db.collection(C.categories).countDocuments({ _id: extra.id })).toBe(0)
  })
})
