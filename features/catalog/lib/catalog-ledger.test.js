import { describe, expect, test } from "bun:test"
import { emptyLedger, applyPurchase, applySale, applyOpenShift } from "@/features/demo/lib/ledger"
import { ONE_SIZE, compareSizes, indexCatalog, seedCatalog, sizeLabel, sizeRangeLabel, variantKey } from "./catalog"
import { parseCatalogImport } from "./catalog-csv"
import { applyDeleteCategory, applyDeleteProduct, applyImportCatalog, applySaveCategory, applySaveProduct, applySetProductStatus } from "./catalog-ledger"

const base = () => ({ ...emptyLedger(), ...seedCatalog() })
const at = Date.now()
const input = { name: "Test Runner", brand: "Velora", category: "Sneakers", audience: "men", price: 1000000, cost: 500000, colors: ["Black", "White"], sizes: ["41", "42"] }

describe("catalog ledger", () => {
  test("creating a product makes one variant per colour and size with unique barcodes", () => {
    const { state, record } = applySaveProduct(base(), { input })
    const mine = indexCatalog(state).variantsByProduct[record.id]
    expect(mine).toHaveLength(4)
    expect(new Set(state.variants.map(({ barcode }) => barcode)).size).toBe(state.variants.length)
    expect(new Set(state.variants.map(({ sku }) => sku)).size).toBe(state.variants.length)
    expect(() => applySaveProduct(state, { input })).toThrow("already exists")
  })

  test("one barcode cannot go on two sizes of the same product", () => {
    const { state, record } = applySaveProduct(base(), { input })
    const [first, second] = indexCatalog(state).variantsByProduct[record.id]
    expect(() => applySaveProduct(state, { productId: record.id, input, barcodes: { [second.id]: first.barcode } })).toThrow("already belongs")
    const nextId = `p-${String(base().productSeq + 1).padStart(2, "0")}`
    const twice = { [variantKey(nextId, "Black", "41")]: "12345678", [variantKey(nextId, "Black", "42")]: "12345678" }
    expect(() => applySaveProduct(base(), { input: { ...input, name: "Other" }, barcodes: twice })).toThrow("used twice")
  })

  test("removing a sold size retires it instead of deleting it", () => {
    let { state, record } = applySaveProduct(base(), { input })
    const sold = indexCatalog(state).variantsByProduct[record.id][0]
    state = applyPurchase(state, { lines: [{ variantId: sold.id, quantity: 2, unitCost: 1 }], supplier: "Test", receivedBy: "u-manager", at }).state
    state = applySaveProduct(state, { productId: record.id, input: { ...input, sizes: ["42"] } }).state
    const after = indexCatalog(state).variantsByProduct[record.id]
    expect(after.find(({ id }) => id === sold.id).active).toBe(false)
    expect(after.filter(({ active }) => active)).toHaveLength(2)
    expect(() => applyDeleteProduct(state, { productId: record.id })).toThrow("Archive it instead")
  })

  test("archived products cannot be sold", () => {
    let state = base()
    const shoe = state.variants[0]
    state = applyPurchase(state, { lines: [{ variantId: shoe.id, quantity: 1, unitCost: 1 }], supplier: "Test", receivedBy: "u-manager", at }).state
    const { state: opened, record: shift } = applyOpenShift(state, { cashierId: "u-cashier", openingCash: 0, at })
    const archived = applySetProductStatus(opened, { productId: shoe.productId, status: "archived" }).state
    expect(() =>
      applySale(archived, { lines: [{ variantId: shoe.id, quantity: 1 }], payments: [{ method: "card", amount: shoe.price }], cashierId: "u-cashier", shiftId: shift.id, at })
    ).toThrow("archived")
  })

  test("import creates products, merges sizes into existing ones and books opening stock", () => {
    const rows = [
      { product: "Import Boot", brand: "Velora", category: "Boots", audience: "men", color: "Black", size: "42", price: 900000, cost: 400000, barcode: "", stock: 3 },
      { product: "Import Boot", brand: "Velora", category: "Boots", audience: "men", color: "Black", size: "43", price: 900000, cost: 400000, barcode: "8901234567890", stock: 0 },
      { product: "Velora Aurum Runner", brand: "Velora", category: "Sneakers", audience: "men", color: "Black/Gold", size: "46", price: 1250000, cost: 562500, barcode: "", stock: 1 },
    ]
    const { state, record } = applyImportCatalog(base(), { rows, userId: "u-manager", at })
    expect(record).toEqual({ created: 1, updated: 1, pairs: 4 })
    expect(indexCatalog(state).variantByBarcode["8901234567890"].attributes.size).toBe("43")
    expect(state.products.find(({ name }) => name === "Velora Aurum Runner").sizes).toContain("46")
  })
})

describe("categories", () => {
  const base = () => ({ ...emptyLedger(), ...seedCatalog() })

  test("a new category needs a unique name, a size type and an icon", () => {
    const { state, record } = applySaveCategory(base(), { name: " Shoe  care ", sizeType: "one", icon: "brush", pctCode: "3405.1000" })
    expect(record).toMatchObject({ name: "Shoe care", sizeType: "one", icon: "brush" })
    expect(state.categories.at(-1).id).toMatch(/^c-[a-f0-9]{8}$/)
    expect(() => applySaveCategory(state, { name: "shoe care", sizeType: "one", icon: "brush" })).toThrow("already exists")
    expect(() => applySaveCategory(state, { name: "Laces", sizeType: "huge", icon: "brush" })).toThrow("sized")
    expect(() => applySaveCategory(state, { name: "Laces", sizeType: "one", icon: "brush", pctCode: "12" })).toThrow("PCT")
  })

  test("renaming moves its products, but used sizes are locked and used categories cannot be deleted", () => {
    const state = base()
    const heels = state.categories.find(({ name }) => name === "Heels")
    const renamed = applySaveCategory(state, { categoryId: heels.id, name: "Party heels", sizeType: "shoe", icon: "heel" }).state
    expect(renamed.products.filter(({ category }) => category === "Party heels").length).toBe(state.products.filter(({ category }) => category === "Heels").length)
    expect(() => applySaveCategory(state, { categoryId: heels.id, name: "Heels", sizeType: "clothing", icon: "heel" })).toThrow("new category")
    expect(() => applyDeleteCategory(state, { categoryId: heels.id })).toThrow("Move them first")
  })

  test("one-size and clothing products sort and label sensibly", () => {
    expect(["XL", "S", "M"].toSorted(compareSizes)).toEqual(["S", "M", "XL"])
    expect(["42", "40", "9"].toSorted(compareSizes)).toEqual(["9", "40", "42"])
    expect(sizeLabel("42")).toBe("EU 42")
    expect(sizeLabel(ONE_SIZE)).toBe(ONE_SIZE)
    expect(sizeRangeLabel(["M", "S", "XL"])).toBe("S–XL")
    expect(sizeRangeLabel(["40", "38"])).toBe("EU 38–40")
  })

  test("a CSV import creates categories it has not seen, sized from its rows", () => {
    const { rows } = parseCatalogImport(
      ["product,brand,category,audience,color,size,price,cost", "Kiwi Polish,Kiwi,Shoe care,unisex,Black,one size,450,200", "Ankle Socks,Velora,Socks,men,White,m,600,250"].join("\n")
    )
    const { state } = applyImportCatalog(base(), { rows, userId: "u-manager", at: Date.now() })
    expect(state.categories.find(({ name }) => name === "Shoe care").sizeType).toBe("one")
    expect(state.categories.find(({ name }) => name === "Socks").sizeType).toBe("clothing")
    expect(state.products.find(({ name }) => name === "Ankle Socks").sizes).toEqual(["M"])
  })
})
