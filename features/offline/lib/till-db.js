import Dexie from "dexie"

export const TILL_DB = "velora-till"

export const createTillDb = (name = TILL_DB, options) => {
  const db = new Dexie(name, options)
  db.version(1).stores({
    outbox: "clientId, cashierId, queuedAt",
    counters: "shiftId",
    snapshots: "userId",
  })
  return db
}

let shared = null

export const tillDb = () => {
  if (typeof indexedDB === "undefined") return null
  shared ??= createTillDb()
  return shared
}
