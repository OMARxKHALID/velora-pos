import { SHOP_ID } from "@/features/catalog/lib/catalog"
import { footwear } from "@/features/catalog/types/footwear"
import { firstShopDocuments } from "@/features/shops/lib/first-shop"
import { COLLECTIONS as C, toDoc } from "@/lib/db/collections"
import { createSeed } from "./seed"

const DATE_FIELDS = ["soldAt", "syncedAt", "createdAt", "updatedAt", "decidedAt", "openedAt", "closedAt", "receivedAt", "parkedAt"]

const withDates = (doc) =>
  Object.fromEntries(Object.entries(doc).map(([key, value]) => [key, DATE_FIELDS.includes(key) && typeof value === "number" ? new Date(value) : value]))

const asDoc = (record) => withDates(toDoc(record))

export const seedDocuments = (now = Date.now()) => {
  const state = createSeed(now)
  const shopOf = Object.fromEntries(state.products.map(({ id, shopId }) => [id, shopId]))

  const { shop, register, settings } = firstShopDocuments(new Date(now))

  return {
    [C.shops]: [shop],
    [C.registers]: [{ ...register, lastReceiptSeq: state.receiptSeq }],
    [C.settings]: [settings],
    [C.counters]: [
      { _id: "barcode", seq: state.barcodeSeq },
      { _id: "product", seq: state.productSeq },
    ],
    [C.products]: state.products.map(asDoc),
    [C.variants]: state.variants.map((variant) => asDoc({ ...variant, shopId: shopOf[variant.productId], label: footwear.labelFor(variant.attributes) })),
    [C.stock]: Object.entries(state.stock).map(([variantId, quantity]) => ({ _id: `${SHOP_ID}:${variantId}`, shopId: SHOP_ID, variantId, quantity })),
    [C.movements]: state.movements.map(asDoc),
    [C.sales]: state.sales.map(asDoc),
    [C.refunds]: state.refunds.map(asDoc),
    [C.shifts]: state.shifts.map(asDoc),
    [C.purchases]: state.purchases.map(asDoc),
    [C.heldCarts]: [],
    [C.auditLog]: [],
  }
}

export const loadDocuments = async (db, documents) => {
  const inserted = {}
  for (const [collection, docs] of Object.entries(documents)) {
    if (docs.length) await db.collection(collection).insertMany(docs, { ordered: true })
    inserted[collection] = docs.length
  }
  return inserted
}

export const dropCollections = async (db) => {
  const existing = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map(({ name }) => name))
  for (const name of Object.values(C)) {
    if (existing.has(name)) await db.collection(name).drop()
  }
}
