import "server-only"
import { COLLECTIONS as C } from "@/server/db/collections"
import { DAY } from "@/shared/lib/dates"

const PIN_LIMITS = [
  { limit: 5, window: 5 * 60 * 1000 },
  { limit: 20, window: DAY },
]

export const createPinAttempts = (db, { limits = PIN_LIMITS } = {}) => {
  const failures = db.collection(C.pinFailures)
  const recent = (supervisorId, now, window) => failures.countDocuments({ supervisorId, at: { $gt: new Date(now.getTime() - window) } })
  const over = async (supervisorId, now, allowed) => {
    for (const { limit, window } of limits) if ((await recent(supervisorId, now, window)) > limit - allowed) return true
    return false
  }
  return {
    blocked: (supervisorId, now = new Date()) => over(supervisorId, now, 1),
    lockedForDay: async (supervisorId, now = new Date()) => {
      const { limit, window } = limits.at(-1)
      return (await recent(supervisorId, now, window)) >= limit
    },
    claim: async (supervisorId, now = new Date()) => {
      const { insertedId } = await failures.insertOne({ supervisorId, at: now })
      if (!(await over(supervisorId, now, 0))) return insertedId
      await failures.deleteOne({ _id: insertedId })
      return null
    },
    release: (id) => failures.deleteOne({ _id: id }),
    clear: (supervisorId) => failures.deleteMany({ supervisorId }),
  }
}
