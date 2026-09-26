import { COLLECTIONS as C } from "@/server/db/collections"

const SIGN_IN_WINDOW_MS = 15 * 60 * 1000

export const clientAddress = (headers) => headers.get("x-forwarded-for")?.split(",")[0].trim() || headers.get("x-real-ip") || null

export const createSignInAttempts = (db, { perUsername = 10, perAddress = 50, window = SIGN_IN_WINDOW_MS } = {}) => {
  const failures = db.collection(C.signInFailures)
  const recent = (now) => ({ $gt: new Date(now.getTime() - window) })
  return {
    blocked: async ({ username, address }, now = new Date()) => {
      const [byName, byAddress] = await Promise.all([
        failures.countDocuments({ username, at: recent(now) }),
        address ? failures.countDocuments({ ip: address, at: recent(now) }) : 0,
      ])
      return byName >= perUsername || byAddress >= perAddress
    },
    fail: ({ username, address }, now = new Date()) => failures.insertOne({ username, ip: address, at: now }),
    clear: (username) => failures.deleteMany({ username }),
  }
}
