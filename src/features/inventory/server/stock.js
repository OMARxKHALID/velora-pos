import { UserError } from "@/shared/lib/errors"
import { COLLECTIONS as C } from "@/server/db/collections"
import { newId } from "@/shared/lib/id"

const stockId = (shopId, variantId) => `${shopId}:${variantId}`

export const moveStock = async (db, session, { shopId, variantId, quantity, type, unitCost, ref = null, userId, reason = null, note = null, at, allowNegative = false }) => {
  if (!Number.isInteger(quantity) || quantity === 0) throw new UserError("Quantity must be a whole number and not zero")
  const taking = quantity < 0
  const filter = { _id: stockId(shopId, variantId), ...(taking && !allowNegative ? { quantity: { $gte: -quantity } } : {}) }
  const stock = await db
    .collection(C.stock)
    .findOneAndUpdate(filter, { $inc: { quantity }, $setOnInsert: { shopId, variantId } }, { upsert: !taking || allowNegative, returnDocument: "after", session })
  if (!stock) throw new UserError("Not enough stock")

  const movement = { _id: newId(), shopId, variantId, type, quantity, balanceAfter: stock.quantity, unitCost, reason, note, ref, userId, createdAt: at }
  await db.collection(C.movements).insertOne(movement, { session })
  return movement
}

export const shopVariants = async (db, session, shopId, variantIds) => {
  const variants = await db.collection(C.variants).find({ _id: { $in: [...new Set(variantIds)] }, shopId }, { session }).toArray()
  const byId = Object.fromEntries(variants.map((variant) => [variant._id, variant]))
  for (const id of variantIds) if (!byId[id]) throw new UserError("Unknown item")
  return byId
}
