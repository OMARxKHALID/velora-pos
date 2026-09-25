import { COLLECTIONS as C } from "@/lib/db/collections"
import { firstShopDocuments } from "../lib/first-shop"

export const ensureFirstShop = async (db, now = new Date()) => {
  const { shop, register, settings } = firstShopDocuments(now)
  const created = []
  for (const [collection, { _id, ...fields }] of [
    [C.shops, shop],
    [C.registers, register],
    [C.settings, settings],
  ]) {
    const { upsertedCount } = await db.collection(collection).updateOne({ _id }, { $setOnInsert: fields }, { upsert: true })
    if (upsertedCount) created.push(collection)
  }
  return created
}
