import "server-only"
import { COLLECTIONS as C } from "@/server/db/collections"

const SIGN_IN_WINDOW_MS = 15 * 60 * 1000

const lastEntry = (value) => value?.split(",").at(-1).trim() || null

export const clientAddress = (headers, trustedHeader = null) => (trustedHeader ? lastEntry(headers.get(trustedHeader)) : lastEntry(headers.get("x-forwarded-for")) || headers.get("x-real-ip") || null)

export const createSignInAttempts = (db, { perUsername = 10, perAddress = 50, window = SIGN_IN_WINDOW_MS } = {}) => {
  const failures = db.collection(C.signInFailures)
  const recent = (now) => ({ $gt: new Date(now.getTime() - window) })
  const counts = ({ username, address }, now) =>
    Promise.all([failures.countDocuments({ username, at: recent(now) }), address ? failures.countDocuments({ ip: address, at: recent(now) }) : 0])
  const over = ([byName, byAddress]) => byName > perUsername || byAddress > perAddress
  return {
    claim: async ({ username, address }, now = new Date()) => {
      const { insertedId } = await failures.insertOne({ username, ip: address, at: now })
      if (!over(await counts({ username, address }, now))) return insertedId
      await failures.deleteOne({ _id: insertedId })
      return null
    },
    release: (id) => failures.deleteOne({ _id: id }),
    clear: (username) => failures.deleteMany({ username }),
  }
}
