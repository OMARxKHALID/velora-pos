import { COLLECTIONS as C } from "@/server/db/collections"

const SIGN_IN_WINDOW_MS = 15 * 60 * 1000

export const clientAddress = (headers) => headers.get("x-forwarded-for")?.split(",")[0].trim() || headers.get("x-real-ip") || null

export const createSignInAttempts = (db, { perUsername = 10, perAddress = 50, window = SIGN_IN_WINDOW_MS } = {}) => {
  const failures = db.collection(C.signInFailures)
  const recent = (now) => ({ $gt: new Date(now.getTime() - window) })
  const counts = ({ username, address }, now) =>
    Promise.all([failures.countDocuments({ username, at: recent(now) }), address ? failures.countDocuments({ ip: address, at: recent(now) }) : 0])
  const over = ([byName, byAddress], limitName, limitAddress) => byName > limitName || byAddress > limitAddress
  return {
    blocked: async (attempt, now = new Date()) => over(await counts(attempt, now), perUsername - 1, perAddress - 1),
    claim: async ({ username, address }, now = new Date()) => {
      const { insertedId } = await failures.insertOne({ username, ip: address, at: now })
      if (!over(await counts({ username, address }, now), perUsername, perAddress)) return insertedId
      await failures.deleteOne({ _id: insertedId })
      return null
    },
    release: (id) => failures.deleteOne({ _id: id }),
    fail: ({ username, address }, now = new Date()) => failures.insertOne({ username, ip: address, at: now }),
    clear: (username) => failures.deleteMany({ username }),
  }
}
