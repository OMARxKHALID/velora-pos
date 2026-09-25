import { PAGE_CACHES } from "./cache-names"
import { clearSnapshots } from "./outbox"
import { tillDb } from "./till-db"

export const forgetDevice = async () => {
  const till = tillDb()
  if (till) await clearSnapshots(till).catch(() => {})
  if (typeof caches !== "undefined") await Promise.all(Object.values(PAGE_CACHES).map((name) => caches.delete(name))).catch(() => {})
}
