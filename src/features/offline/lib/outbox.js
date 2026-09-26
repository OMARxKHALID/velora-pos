import { offlineNumbers } from "@/features/pos/lib/receipts"

export class SessionEnded extends Error {}

export const NO_NUMBERS = "No offline receipt numbers are left on this till. Reconnect to keep selling."

export const queueOfflineSale = async (db, { shift, cashierId, sale, payload }) =>
  db.transaction("rw", db.outbox, db.counters, async () => {
    const used = Math.max((await db.counters.get(shift.id))?.used ?? 0, shift.offlineNext ?? 0)
    const number = offlineNumbers(shift.registerCode, shift.receiptBlocks)[used]
    if (!number) throw new Error(NO_NUMBERS)
    const entry = {
      clientId: payload.clientId,
      cashierId,
      shiftId: shift.id,
      queuedAt: payload.soldAt,
      status: "pending",
      error: null,
      payload: { ...payload, number },
      sale: { ...sale, number },
    }
    await db.counters.put({ shiftId: shift.id, used: used + 1 })
    await db.outbox.add(entry)
    return entry
  })

export const outboxFor = async (db, cashierId) => db.outbox.where("cashierId").equals(cashierId).sortBy("queuedAt")

export const countersFor = async (db, shiftIds) => {
  const rows = await db.counters.bulkGet(shiftIds)
  return Object.fromEntries(shiftIds.map((shiftId, index) => [shiftId, rows[index]?.used ?? 0]))
}

export const retryEntry = async (db, clientId) => db.outbox.update(clientId, { status: "pending", error: null })

export const removeEntry = async (db, clientId) => db.outbox.delete(clientId)

export const flushOutbox = async (db, { cashierId, send }) => {
  const result = { uploaded: 0, failed: 0 }
  for (const entry of await outboxFor(db, cashierId)) {
    if (entry.status !== "pending") continue
    const outcome = await send(entry.payload)
    if (outcome.sale) {
      await db.outbox.delete(entry.clientId)
      result.uploaded += 1
    } else {
      await db.outbox.update(entry.clientId, { status: "failed", error: outcome.error })
      result.failed += 1
    }
  }
  return result
}

const UPLOAD_TIMEOUT_MS = 15_000

export const sendOfflineSale = async (payload, { timeoutMs = UPLOAD_TIMEOUT_MS } = {}) => {
  const response = await fetch("/api/sync/sales", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), signal: AbortSignal.timeout(timeoutMs) })
  if (response.status === 401) throw new SessionEnded("Your session has ended. Sign in again.")
  if (response.ok) return { sale: (await response.json()).sale }
  if (response.status >= 400 && response.status < 500) return { error: (await response.json().catch(() => null))?.error ?? "The server refused this sale" }
  throw new Error(`Upload failed (${response.status})`)
}

export const saveSnapshot = async (db, userId, text) => db.snapshots.put({ userId, text, savedAt: Date.now() })

export const readSnapshot = async (db, userId) => db.snapshots.get(userId)

export const clearSnapshots = async (db) => db.snapshots.clear()
