import { COLLECTIONS as C } from "./collections"

const caseInsensitive = { locale: "en", strength: 2 }

export const INDEXES = {
  [C.shops]: [{ key: { code: 1 }, name: "code_unique", unique: true }],
  [C.registers]: [{ key: { shopId: 1, code: 1 }, name: "shop_code_unique", unique: true }],
  [C.products]: [
    { key: { shopId: 1, brand: 1, name: 1 }, name: "shop_brand_name_unique", unique: true, collation: caseInsensitive },
    { key: { shopId: 1, status: 1 }, name: "shop_status" },
  ],
  [C.variants]: [
    { key: { barcode: 1 }, name: "barcode_unique", unique: true },
    { key: { shopId: 1, sku: 1 }, name: "shop_sku_unique", unique: true },
    { key: { productId: 1 }, name: "product" },
  ],
  [C.stock]: [{ key: { shopId: 1, variantId: 1 }, name: "shop_variant_unique", unique: true }],
  [C.movements]: [
    { key: { shopId: 1, variantId: 1, createdAt: -1 }, name: "shop_variant_time" },
    { key: { shopId: 1, createdAt: -1 }, name: "shop_time" },
    { key: { "ref.id": 1 }, name: "ref" },
  ],
  [C.sales]: [
    { key: { clientId: 1 }, name: "client_unique", unique: true },
    { key: { registerId: 1, number: 1 }, name: "register_number_unique", unique: true },
    { key: { shopId: 1, soldAt: -1 }, name: "shop_time" },
    { key: { shiftId: 1 }, name: "shift" },
    { key: { cashierId: 1, soldAt: -1 }, name: "cashier_time" },
  ],
  [C.refunds]: [
    { key: { clientId: 1 }, name: "client_unique", unique: true },
    { key: { saleId: 1 }, name: "sale" },
    { key: { shopId: 1, status: 1, createdAt: -1 }, name: "shop_status_time" },
  ],
  [C.shifts]: [
    { key: { clientId: 1 }, name: "client_unique", unique: true },
    { key: { registerId: 1 }, name: "one_open_shift_per_register", unique: true, partialFilterExpression: { status: "open" } },
    { key: { shopId: 1, openedAt: -1 }, name: "shop_time" },
  ],
  [C.purchases]: [{ key: { shopId: 1, receivedAt: -1 }, name: "shop_time" }],
  [C.heldCarts]: [{ key: { registerId: 1, parkedAt: -1 }, name: "register_time" }],
  [C.auditLog]: [{ key: { shopId: 1, at: -1 }, name: "shop_time" }],
}

export const ensureIndexes = async (db) => {
  const created = {}
  for (const [collection, indexes] of Object.entries(INDEXES)) {
    created[collection] = await db.collection(collection).createIndexes(indexes)
  }
  return created
}
