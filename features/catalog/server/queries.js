import { COLLECTIONS as C, fromDoc } from "@/lib/db/collections"
import { escapeRegExp } from "@/lib/escape-regexp"

export const PAGE_SIZE = 50

const searchFilter = async (db, shopIds, q) => {
  const pattern = new RegExp(escapeRegExp(q.trim()), "i")
  const [products, variants, people] = await Promise.all([
    db.collection(C.products).find({ shopId: { $in: shopIds }, name: pattern }, { projection: { _id: 1 } }).toArray(),
    db.collection(C.variants).find({ shopId: { $in: shopIds }, $or: [{ sku: pattern }, { barcode: pattern }] }, { projection: { _id: 1 } }).toArray(),
    db.collection(C.users).find({ name: pattern }, { projection: { _id: 1 } }).toArray(),
  ])
  const fromProducts = products.length ? await db.collection(C.variants).find({ productId: { $in: products.map(({ _id }) => _id) } }, { projection: { _id: 1 } }).toArray() : []
  return {
    $or: [
      { variantId: { $in: [...variants, ...fromProducts].map(({ _id }) => _id) } },
      { userId: { $in: people.map(({ _id }) => _id) } },
      { "ref.number": pattern },
    ],
  }
}

export const movementsPage = async (db, { shopId, shopIds = [shopId], page = 1, pageSize = PAGE_SIZE, type = null, variantIds = null, from = null, to = null, q = "" }) => {
  const filter = {
    shopId: { $in: shopIds },
    ...(type ? { type } : {}),
    ...(variantIds ? { variantId: { $in: variantIds } } : {}),
    ...(from || to ? { createdAt: { ...(from ? { $gte: from } : {}), ...(to ? { $lt: to } : {}) } } : {}),
    ...(q.trim() ? await searchFilter(db, shopIds, q) : {}),
  }
  const size = Math.min(Math.max(1, pageSize), 200)
  const current = Math.max(1, page)
  const [rows, total] = await Promise.all([
    db.collection(C.movements).find(filter, { sort: { createdAt: -1, _id: -1 }, skip: (current - 1) * size, limit: size }).toArray(),
    db.collection(C.movements).countDocuments(filter),
  ])
  const variants = await db.collection(C.variants).find({ _id: { $in: [...new Set(rows.map(({ variantId }) => variantId))] } }, { projection: { productId: 1, sku: 1, label: 1, attributes: 1 } }).toArray()
  const products = await db.collection(C.products).find({ _id: { $in: [...new Set(variants.map(({ productId }) => productId))] } }, { projection: { name: 1, brand: 1 } }).toArray()
  const variantById = Object.fromEntries(variants.map((variant) => [variant._id, variant]))
  const productById = Object.fromEntries(products.map((product) => [product._id, product]))
  return {
    page: current,
    pageSize: size,
    total,
    rows: rows.map((movement) => {
      const variant = variantById[movement.variantId]
      const product = productById[variant?.productId]
      return { ...fromDoc(movement), sku: variant?.sku ?? null, label: variant?.label ?? null, productName: product ? product.name : null }
    }),
  }
}
