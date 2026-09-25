import { z } from "zod"
import { UserError } from "@/features/auth/server/session-errors"
import { moveStock } from "@/features/inventory/server/stock"
import { changesBetween, writeAudit } from "@/lib/db/audit"
import { COLLECTIONS as C, fromDoc, toDoc } from "@/lib/db/collections"
import { isDuplicateKey, withTransaction } from "@/lib/db/transaction"
import { newId } from "@/lib/id"
import { productTypeFor } from "../types"
import { sameColor } from "../lib/catalog"
import { planProductSave } from "../lib/plan-product"

const caseInsensitive = { locale: "en", strength: 2 }
const AUDITED = ["name", "brand", "price", "cost", "discountPct", "status"]

const commonSchema = z
  .object({
    productType: z.string().default("footwear"),
    name: z.string().trim().min(2, { error: "Enter the product name" }).max(60),
    brand: z.string().trim().min(1, { error: "Enter the brand" }).max(30),
    price: z.number().int({ error: "Prices are whole paisa" }).positive({ error: "Price must be above 0" }),
    cost: z.number().int({ error: "Costs are whole paisa" }).min(0, { error: "Cost cannot be negative" }),
    discountPct: z.number().min(0).max(90, { error: "Discount is too big" }).default(0),
  })
  .refine(({ cost, price }) => cost <= price, { error: "Cost cannot be higher than the price", path: ["cost"] })

const parse = (schema, value) => {
  const result = schema.safeParse(value)
  if (!result.success) throw new UserError(result.error.issues[0].message)
  return result.data
}

export const parseProductInput = (input) => {
  const common = parse(commonSchema, input)
  const type = productTypeFor(common.productType)
  return { type, input: { ...common, ...parse(type.fieldsSchema, type.fieldsOf(input)) } }
}

const nextSeq = async (db, session, key) =>
  (await db.collection(C.counters).findOneAndUpdate({ _id: key }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: "after", session })).seq

const friendly = (error, input) => {
  if (!isDuplicateKey(error)) return error
  const index = error.errorResponse?.keyPattern ?? {}
  if ("barcode" in index) return new UserError(`Barcode ${error.errorResponse?.keyValue?.barcode ?? ""} is already used by another item`.replace("  ", " "))
  if ("name" in index) return new UserError(`${input.brand} ${input.name} already exists`)
  if ("sku" in index) return new UserError("Two items would get the same SKU. Rename one of the colours.")
  return error
}

const usedVariantIds = async (db, session, ids) => new Set(ids.length ? await db.collection(C.movements).distinct("variantId", { variantId: { $in: ids } }, { session }) : [])

const saveInSession = async (db, session, { shopId, user, at }, { productId = null, input: raw, barcodes: barcodesFor = {}, openingStock: stockFor = [], supplier = "Opening stock" }) => {
  const { type, input } = parseProductInput(raw)
  const products = db.collection(C.products)
  const variants = db.collection(C.variants)

  const existing = productId ? await products.findOne({ _id: productId, shopId }, { session }) : null
  if (productId && !existing) throw new UserError("Product not found")
  if (existing && existing.productType !== type.type) throw new UserError("A product cannot change type")

  const duplicate = await products.findOne({ shopId, brand: input.brand, name: input.name, _id: { $ne: productId ?? "" } }, { session, collation: caseInsensitive })
  if (duplicate) throw new UserError(`${input.brand} ${input.name} already exists`)

  let product
  if (existing) {
    product = { ...fromDoc(existing), ...input, discountPct: input.discountPct ?? existing.discountPct ?? 0 }
  } else {
    const seq = await nextSeq(db, session, "product")
    const code = String(seq).padStart(2, "0")
    product = { id: `p-${code}`, code, shopId, popularity: 3, status: "active", createdAt: at, ...input }
  }

  const barcodes = typeof barcodesFor === "function" ? barcodesFor(product.id) : barcodesFor
  const openingStock = typeof stockFor === "function" ? stockFor(product.id) : stockFor
  const current = (await variants.find({ productId: product.id }, { session }).toArray()).map(fromDoc)
  const usedIds = await usedVariantIds(db, session, current.map(({ id }) => id))
  const customBarcodes = Object.values(barcodes)
  const owners = customBarcodes.length
    ? Object.fromEntries((await variants.find({ barcode: { $in: customBarcodes } }, { session, projection: { barcode: 1, sku: 1 } }).toArray()).map((doc) => [doc.barcode, doc]))
    : {}
  const serials = []
  const needed = type.variantOptions(product).filter((options) => !current.some(({ id }) => id === type.variantId(product.id, options))).length
  for (let index = 0; index < needed; index += 1) serials.push(await nextSeq(db, session, "barcode"))

  let plan
  try {
    plan = planProductSave({
      type,
      product,
      current,
      usedIds,
      barcodes,
      barcodeOwner: (barcode, id) => (owners[barcode] && owners[barcode]._id !== id ? owners[barcode].sku : null),
      nextSerial: () => serials.shift(),
    })
  } catch (error) {
    throw new UserError(error.message)
  }

  const stored = { ...product, updatedAt: at }
  await products.replaceOne({ _id: product.id }, toDoc(stored), { upsert: true, session })
  if (plan.remove.length) {
    await variants.deleteMany({ _id: { $in: plan.remove } }, { session })
    await db.collection(C.stock).deleteMany({ variantId: { $in: plan.remove }, quantity: 0 }, { session })
  }
  for (const variant of [...plan.keep, ...plan.retire]) {
    const options = variant.attributes
    await variants.replaceOne({ _id: variant.id }, toDoc({ ...variant, shopId, label: type.labelFor(options) }), { upsert: true, session })
  }

  const changes = changesBetween(existing, stored, AUDITED)
  if (!existing || Object.keys(changes).length) {
    await writeAudit(db, session, { shopId, userId: user.id, kind: existing ? "product.update" : "product.create", target: product.id, changes: existing ? changes : null, at })
  }

  const keptIds = new Set(plan.keep.map(({ id }) => id))
  const stockLines = openingStock.filter(({ quantity }) => quantity > 0)
  for (const { variantId, quantity } of stockLines) {
    if (!keptIds.has(variantId)) throw new UserError("Opening stock must be for this product's sizes")
    if (!Number.isInteger(quantity) || quantity > 10000) throw new UserError("Opening stock is whole pairs, at most 10,000 per size")
  }
  if (stockLines.length) {
    const purchaseId = newId()
    const items = stockLines.map(({ variantId, quantity }) => ({ variantId, quantity, unitCost: product.cost }))
    await db.collection(C.purchases).insertOne(
      { _id: purchaseId, shopId, supplier, items, total: items.reduce((sum, { quantity, unitCost }) => sum + quantity * unitCost, 0), receivedBy: user.id, receivedAt: at },
      { session }
    )
    for (const { variantId, quantity, unitCost } of items) {
      await moveStock(db, session, { shopId, variantId, quantity, type: "purchase", unitCost, ref: { kind: "Purchase", id: purchaseId, number: supplier }, userId: user.id, at })
    }
  }

  return {
    id: product.id,
    created: !existing,
    variants: plan.keep.length,
    retired: plan.retire.length,
    removed: plan.remove.length,
    pairs: stockLines.reduce((sum, { quantity }) => sum + quantity, 0),
  }
}

export const saveProduct = async ({ db, client, user, shopId, at = new Date() }, request) => {
  try {
    return await withTransaction(client, (session) => saveInSession(db, session, { shopId, user, at }, request))
  } catch (error) {
    throw friendly(error, request.input ?? {})
  }
}

export const setProductStatus = async ({ db, client, user, shopId, at = new Date() }, { productId, status }) => {
  if (!["active", "archived"].includes(status)) throw new UserError("Unknown status")
  return withTransaction(client, async (session) => {
    const product = await db.collection(C.products).findOne({ _id: productId, shopId }, { session })
    if (!product) throw new UserError("Product not found")
    if (product.status === status) return { id: productId }
    await db.collection(C.products).updateOne({ _id: productId }, { $set: { status, updatedAt: at } }, { session })
    await writeAudit(db, session, { shopId, userId: user.id, kind: "product.status", target: productId, changes: { status: { from: product.status, to: status } }, at })
    return { id: productId }
  })
}

export const deleteProduct = async ({ db, client, user, shopId, at = new Date() }, { productId }) =>
  withTransaction(client, async (session) => {
    const product = await db.collection(C.products).findOne({ _id: productId, shopId }, { session })
    if (!product) throw new UserError("Product not found")
    const ids = (await db.collection(C.variants).find({ productId }, { session, projection: { _id: 1 } }).toArray()).map(({ _id }) => _id)
    if ((await usedVariantIds(db, session, ids)).size) throw new UserError("This product has stock history. Archive it instead.")
    await db.collection(C.variants).deleteMany({ productId }, { session })
    await db.collection(C.stock).deleteMany({ variantId: { $in: ids } }, { session })
    await db.collection(C.products).deleteOne({ _id: productId }, { session })
    await writeAudit(db, session, { shopId, userId: user.id, kind: "product.delete", target: productId, changes: { name: { from: `${product.brand} ${product.name}`, to: null } }, at })
    return { id: productId }
  })

const groupRows = (rows) => Object.values(Object.groupBy(rows, ({ product, brand }) => `${product.trim().toLowerCase()}|${brand.trim().toLowerCase()}`))

export const importCatalog = async ({ db, client, user, shopId, at = new Date() }, { rows }) => {
  if (!Array.isArray(rows) || !rows.length) throw new UserError("The file has no rows to import")
  if (rows.length > 2000) throw new UserError("Import at most 2000 rows at a time")
  const type = productTypeFor("footwear")
  try {
    return await withTransaction(client, async (session) => {
      const totals = { created: 0, updated: 0, pairs: 0 }
      for (const group of groupRows(rows)) {
        const [first] = group
        const existing = await db.collection(C.products).findOne({ shopId, brand: first.brand.trim(), name: first.product.trim() }, { session, collation: caseInsensitive })
        const known = existing ? type.fieldsOf(existing) : { colors: [], sizes: [] }
        const colors = [...known.colors, ...group.map(({ color }) => color)].reduce((list, color) => (list.some((other) => sameColor(other, color)) ? list : [...list, color]), [])
        const spelling = (color) => colors.find((other) => sameColor(other, color))
        const idFor = (productId, row) => type.variantId(productId, { color: spelling(row.color), size: String(row.size) })
        const saved = await saveInSession(db, session, { shopId, user, at }, {
          productId: existing?._id ?? null,
          supplier: "CSV import",
          input: {
            productType: type.type,
            name: existing?.name ?? first.product,
            brand: existing?.brand ?? first.brand,
            category: first.category,
            audience: first.audience,
            price: first.price,
            cost: first.cost,
            discountPct: existing?.discountPct ?? 0,
            colors,
            sizes: [...new Set([...known.sizes, ...group.map(({ size }) => String(size))])],
          },
          barcodes: (productId) => Object.fromEntries(group.filter(({ barcode }) => barcode).map((row) => [idFor(productId, row), row.barcode])),
          openingStock: (productId) => group.filter(({ stock }) => stock > 0).map((row) => ({ variantId: idFor(productId, row), quantity: row.stock })),
        })
        totals[saved.created ? "created" : "updated"] += 1
        totals.pairs += saved.pairs
      }
      return totals
    })
  } catch (error) {
    throw friendly(error, {})
  }
}
