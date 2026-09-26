import { COLLECTIONS as C } from "@/server/db/collections"

const PIN_ATTEMPT_LIMIT = 5
const PIN_LOCK_MS = 5 * 60 * 1000

export const createPinAttempts = (db, { limit = PIN_ATTEMPT_LIMIT, window = PIN_LOCK_MS } = {}) => {
  const failures = db.collection(C.pinFailures)
  const recent = (supervisorId, now) => failures.countDocuments({ supervisorId, at: { $gt: new Date(now.getTime() - window) } })
  return {
    blocked: async (supervisorId, now = new Date()) => (await recent(supervisorId, now)) >= limit,
    claim: async (supervisorId, now = new Date()) => {
      const { insertedId } = await failures.insertOne({ supervisorId, at: now })
      if ((await recent(supervisorId, now)) <= limit) return true
      await failures.deleteOne({ _id: insertedId })
      return false
    },
    clear: (supervisorId) => failures.deleteMany({ supervisorId }),
  }
}
