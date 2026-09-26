import { COLLECTIONS as C } from "./collections"

const ALL = "ledger:all"
const SAFETY_WINDOW_MS = 10 * 60 * 1000

const keyFor = (shopId) => `ledger:${shopId}`

const bump = (_id) => ({ updateOne: { filter: { _id }, update: { $inc: { seq: 1 } }, upsert: true } })

export const bumpLedger = (db, shopId) => db.collection(C.counters).bulkWrite([bump(ALL), ...(shopId ? [bump(keyFor(shopId))] : [])], { ordered: false })

export const bumpAllLedgers = async (db) => {
  const shops = await db.collection(C.shops).find({}, { projection: { _id: 1 } }).toArray()
  return db.collection(C.counters).bulkWrite([bump(ALL), ...shops.map(({ _id }) => bump(keyFor(_id)))], { ordered: false })
}

export const ledgerStamp = async (db, user, now = Date.now()) => {
  const counter = await db.collection(C.counters).findOne({ _id: user.role === "admin" ? ALL : keyFor(user.shopId) }, { projection: { seq: 1 } })
  return `"${user.id}.${user.role}.${user.shopId ?? "all"}.${counter?.seq ?? 0}.${Math.floor(now / SAFETY_WINDOW_MS)}"`
}
