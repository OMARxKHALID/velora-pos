import { COLLECTIONS as C } from "@/lib/db/collections"

const PIN_ATTEMPT_LIMIT = 5
const PIN_LOCK_MS = 5 * 60 * 1000

export const createPinAttempts = (db, { limit = PIN_ATTEMPT_LIMIT, window = PIN_LOCK_MS } = {}) => {
  const failures = db.collection(C.pinFailures)
  return {
    blocked: async (supervisorId, now = new Date()) =>
      (await failures.countDocuments({ supervisorId, at: { $gt: new Date(now.getTime() - window) } })) >= limit,
    fail: (supervisorId, now = new Date()) => failures.insertOne({ supervisorId, at: now }),
    clear: (supervisorId) => failures.deleteMany({ supervisorId }),
  }
}
