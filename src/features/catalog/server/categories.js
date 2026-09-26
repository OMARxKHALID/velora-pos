import { z } from "zod"
import { changesBetween, writeAudit } from "@/server/db/audit"
import { COLLECTIONS as C, fromDoc } from "@/server/db/collections"
import { isDuplicateKey, withTransaction } from "@/server/db/transaction"
import { UserError, parseInput } from "@/shared/lib/errors"
import { newId } from "@/shared/lib/id"
import { CATEGORY_ICONS, PCT_PATTERN, SIZE_TYPES } from "../lib/catalog"

const caseInsensitive = { locale: "en", strength: 2 }
const AUDITED = ["name", "sizeType", "icon", "pctCode", "lowStockAt"]

const categorySchema = z.object({
  categoryId: z.string().min(1).max(64).nullish(),
  name: z.string().trim().min(1, { error: "Enter a category name, up to 30 characters" }).max(30, { error: "Enter a category name, up to 30 characters" }),
  sizeType: z.enum(Object.keys(SIZE_TYPES), { error: "Pick how this category is sized" }),
  icon: z.enum(CATEGORY_ICONS, { error: "Pick an icon" }),
  pctCode: z.string().trim().refine((code) => !code || PCT_PATTERN.test(code), { error: "Use the 8-digit PCT code, like 6403.9900" }).default(""),
  lowStockAt: z.union([z.literal(""), z.null(), z.coerce.number().int().min(0).max(999)], { error: "Low-stock warning must be a whole number from 0 to 999" }).nullish(),
})

const productsIn = (db, session, shopId, name) => db.collection(C.products).find({ shopId, category: name }, { session, collation: caseInsensitive })

export const saveCategory = async ({ db, client, user, shopId, at = new Date() }, input) => {
  const request = parseInput(categorySchema, input)
  const name = request.name.replace(/\s+/g, " ")
  const limit = request.lowStockAt === "" || request.lowStockAt == null ? null : Number(request.lowStockAt)
  try {
    return await withTransaction(client, async (session) => {
      const existing = request.categoryId ? await db.collection(C.categories).findOne({ _id: request.categoryId, shopId }, { session }) : null
      if (request.categoryId && !existing) throw new UserError("Category not found")
      const used = existing ? await productsIn(db, session, shopId, existing.name).toArray() : []
      if (existing && existing.sizeType !== request.sizeType && used.length) throw new UserError("Products already use this category's sizes. Make a new category instead.")

      const record = { ...(existing ?? { _id: `c-${newId().slice(0, 8)}`, shopId, createdAt: at }), name, sizeType: request.sizeType, icon: request.icon, pctCode: request.pctCode, lowStockAt: limit, updatedAt: at }
      await db.collection(C.categories).replaceOne({ _id: record._id }, record, { upsert: true, session })
      if (existing && used.length && existing.name !== name) {
        await db.collection(C.products).updateMany({ shopId, category: existing.name }, { $set: { category: name, updatedAt: at } }, { session, collation: caseInsensitive })
      }
      const changes = changesBetween(existing, record, AUDITED)
      if (!existing || Object.keys(changes).length) {
        await writeAudit(db, session, { shopId, userId: user.id, kind: existing ? "category.update" : "category.create", target: record._id, changes: existing ? changes : null, at })
      }
      return fromDoc(record)
    })
  } catch (error) {
    if (isDuplicateKey(error)) throw new UserError(`${name} already exists`)
    throw error
  }
}

export const deleteCategory = async ({ db, client, user, shopId, at = new Date() }, { categoryId }) =>
  withTransaction(client, async (session) => {
    const category = await db.collection(C.categories).findOne({ _id: categoryId, shopId }, { session })
    if (!category) throw new UserError("Category not found")
    const used = await productsIn(db, session, shopId, category.name).toArray()
    if (used.length) throw new UserError(`${used.length} ${used.length === 1 ? "product uses" : "products use"} this category. Move them first.`)
    await db.collection(C.categories).deleteOne({ _id: categoryId }, { session })
    await writeAudit(db, session, { shopId, userId: user.id, kind: "category.delete", target: categoryId, changes: { name: { from: category.name, to: null } }, at })
    return { id: categoryId }
  })

export const ensureCategories = async (db, session, { shopId, rows, at }) => {
  const known = (await db.collection(C.categories).find({ shopId }, { session }).toArray()).map(({ name }) => name.toLowerCase())
  const seen = new Set(known)
  const added = []
  for (const { category, sizes, icon = "sneaker" } of rows) {
    if (seen.has(category.toLowerCase())) continue
    seen.add(category.toLowerCase())
    const sizeType = sizes.every((size) => /^\d+$/.test(size)) ? "shoe" : sizes.length === 1 && sizes[0] === "One size" ? "one" : "clothing"
    added.push({ _id: `c-${newId().slice(0, 8)}`, shopId, name: category, sizeType, icon, pctCode: "", lowStockAt: null, createdAt: at, updatedAt: at })
  }
  if (added.length) await db.collection(C.categories).insertMany(added, { session })
  return added.length
}
