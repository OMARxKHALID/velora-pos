import "server-only"
import { COLLECTIONS as C, fromDoc } from "./collections"

const TRANSACTION_OPTIONS = {
  readPreference: "primary",
  readConcern: { level: "snapshot" },
  writeConcern: { w: "majority" },
}

export const withTransaction = (client, work, options = {}) =>
  client.withSession((session) => session.withTransaction(() => work(session), { ...TRANSACTION_OPTIONS, ...options }))

export const isDuplicateKey = (error) => error?.code === 11000

export const replayOnDuplicate = async (work, replay) => {
  try {
    return await work()
  } catch (error) {
    if (!isDuplicateKey(error)) throw error
    const existing = await replay()
    if (existing) return existing
    throw error
  }
}

export const findByClientId = async (db, session, collection, clientId) => fromDoc(await db.collection(collection).findOne({ clientId }, { session }))

export const findDocs = async (db, session, collection, filter) => (await db.collection(collection).find(filter, { session }).toArray()).map(fromDoc)

export const lockShift = (db, session, shiftId) => db.collection(C.shifts).updateOne({ _id: shiftId }, { $inc: { writeSeq: 1 } }, { session })

export const lockSale = (db, session, saleId) => db.collection(C.sales).updateOne({ _id: saleId }, { $inc: { claimSeq: 1 } }, { session })
