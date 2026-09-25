import { SHOP_NAME } from "@/features/shops/lib/constants"
import { REGISTER_CODE, REGISTER_ID, SHOP_ID } from "@/features/catalog/lib/catalog"
import { defaultPricingSettings } from "@/features/pricing/lib/pricing"
import { footwear } from "@/features/catalog/types/footwear"
import { COLLECTIONS as C, toDoc } from "@/lib/db/collections"
import { createSeed } from "./seed"

export const seedDocuments = (now = Date.now()) => {
  const state = createSeed(now)
  const shopOf = Object.fromEntries(state.products.map(({ id, shopId }) => [id, shopId]))

  return {
    [C.shops]: [{ _id: SHOP_ID, code: "SH1", type: "footwear", name: SHOP_NAME, createdAt: now }],
    [C.registers]: [{ _id: REGISTER_ID, shopId: SHOP_ID, code: REGISTER_CODE, lastReceiptSeq: state.receiptSeq }],
    [C.settings]: [{ _id: SHOP_ID, shopId: SHOP_ID, ...defaultPricingSettings() }],
    [C.counters]: [
      { _id: "barcode", seq: state.barcodeSeq },
      { _id: "product", seq: state.productSeq },
    ],
    [C.products]: state.products.map(toDoc),
    [C.variants]: state.variants.map((variant) => toDoc({ ...variant, shopId: shopOf[variant.productId], label: footwear.labelFor(variant.attributes) })),
    [C.stock]: Object.entries(state.stock).map(([variantId, quantity]) => ({ _id: `${SHOP_ID}:${variantId}`, shopId: SHOP_ID, variantId, quantity })),
    [C.movements]: state.movements.map(toDoc),
    [C.sales]: state.sales.map(toDoc),
    [C.refunds]: state.refunds.map(toDoc),
    [C.shifts]: state.shifts.map(toDoc),
    [C.purchases]: state.purchases.map(toDoc),
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
