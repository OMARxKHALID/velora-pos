import { COLLECTIONS as C } from "./collections"

const ALL = "ledger:all"
const SAFETY_WINDOW_MS = 10 * 60 * 1000

const keyFor = (shopId) => `ledger:${shopId}`

const ledgerKeyOf = (user) => (user.role === "admin" ? ALL : keyFor(user.shopId))

const bump = (_id) => ({ updateOne: { filter: { _id }, update: { $inc: { seq: 1 } }, upsert: true } })

export const bumpLedger = (db, shopId) => db.collection(C.counters).bulkWrite([bump(ALL), ...(shopId ? [bump(keyFor(shopId))] : [])], { ordered: false })

export const bumpAllLedgers = async (db) => {
  const shops = await db.collection(C.shops).find({}, { projection: { _id: 1 } }).toArray()
  return db.collection(C.counters).bulkWrite([bump(ALL), ...shops.map(({ _id }) => bump(keyFor(_id)))], { ordered: false })
}

export const ledgerStamp = async (db, user, now = Date.now()) => {
  const counter = await db.collection(C.counters).findOne({ _id: ledgerKeyOf(user) }, { projection: { seq: 1 } })
  return `"${user.id}.${user.role}.${user.shopId ?? "all"}.${counter?.seq ?? 0}.${Math.floor(now / SAFETY_WINDOW_MS)}"`
}

const watchers = new Map()

const openWatcher = (db, key, id) => {
  const watcher = { stream: db.collection(C.counters).watch([{ $match: { "documentKey._id": id } }]), listeners: new Set() }
  watcher.stream.on("change", () => watcher.listeners.forEach((listener) => listener("change")))
  watcher.stream.on("error", () => {
    if (watchers.get(key) === watcher) watchers.delete(key)
    watcher.stream.close().catch(() => {})
    watcher.listeners.forEach((listener) => listener("error"))
  })
  watchers.set(key, watcher)
  return watcher
}

export const watchLedger = (db, user, listener) => {
  const id = ledgerKeyOf(user)
  const key = `${db.databaseName}/${id}`
  const watcher = watchers.get(key) ?? openWatcher(db, key, id)
  watcher.listeners.add(listener)
  return () => {
    watcher.listeners.delete(listener)
    if (watcher.listeners.size || watchers.get(key) !== watcher) return
    watchers.delete(key)
    watcher.stream.close().catch(() => {})
  }
}
