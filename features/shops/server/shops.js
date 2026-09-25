import { COLLECTIONS as C } from "@/lib/db/collections"

export const listShops = async (db, shopIds = null) =>
  (await db.collection(C.shops).find(shopIds ? { _id: { $in: shopIds } } : {}, { sort: { _id: 1 }, projection: { name: 1, code: 1 } }).toArray()).map(({ _id, name, code }) => ({ id: _id, name, code }))

export const listRegisters = async (db, shopIds) =>
  (await db.collection(C.registers).find({ shopId: { $in: shopIds } }, { sort: { _id: 1 }, projection: { shopId: 1, code: 1 } }).toArray()).map(({ _id, shopId, code }) => ({ id: _id, shopId, code }))
