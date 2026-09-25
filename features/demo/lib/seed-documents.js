import { SHOP_NAME } from "@/features/shops/lib/constants"
import { REGISTER_CODE, REGISTER_ID, SHOP_ID } from "@/features/catalog/lib/catalog"
import { defaultPricingSettings } from "@/features/pricing/lib/pricing"
import { footwear } from "@/features/catalog/types/footwear"
import { COLLECTIONS as C, toDoc } from "@/lib/db/collections"
import { SHOP_TIME_ZONE } from "@/lib/zoned"
import { createSeed } from "./seed"

const DATE_FIELDS = ["soldAt", "syncedAt", "createdAt", "updatedAt", "decidedAt", "openedAt", "closedAt", "receivedAt", "parkedAt"]

const withDates = (doc) =>
  Object.fromEntries(Object.entries(doc).map(([key, value]) => [key, DATE_FIELDS.includes(key) && typeof value === "number" ? new Date(value) : value]))

const asDoc = (record) => withDates(toDoc(record))

export const seedDocuments = (now = Date.now()) => {
  const state = createSeed(now)
  const shopOf = Object.fromEntries(state.products.map(({ id, shopId }) => [id, shopId]))

  return {
    [C.shops]: [{ _id: SHOP_ID, code: "SH1", type: "footwear", name: SHOP_NAME, timezone: SHOP_TIME_ZONE, createdAt: new Date(now) }],
    [C.registers]: [{ _id: REGISTER_ID, shopId: SHOP_ID, code: REGISTER_CODE, lastReceiptSeq: state.receiptSeq, lastOfflineSeq: 0 }],
    [C.settings]: [{ _id: SHOP_ID, shopId: SHOP_ID, ...defaultPricingSettings() }],
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
