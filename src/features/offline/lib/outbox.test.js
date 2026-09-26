import { expect, test } from "bun:test"
import { IDBFactory, IDBKeyRange } from "fake-indexeddb"
import { newId } from "@/shared/lib/id"
import { NO_NUMBERS, countersFor, flushOutbox, outboxFor, queueOfflineSale, readSnapshot, retryEntry, saveSnapshot } from "./outbox"
import { createTillDb } from "./till-db"

const freshTill = () => createTillDb(`till-${newId()}`, { indexedDB: new IDBFactory(), IDBKeyRange })
const shift = { id: "shift-1", registerCode: "SH1-R1", receiptBlocks: [{ from: 1, to: 2 }, { from: 7, to: 7 }] }
let clock = Date.now()
const queue = (till, cashierId = "u-cashier") => {
  const clientId = newId()
  return queueOfflineSale(till, { shift, cashierId, sale: { id: clientId, items: [] }, payload: { clientId, soldAt: (clock += 1000) } })
}

test("each offline sale takes the next number from the shift's blocks, even from two tabs at once", async () => {
  const till = freshTill()
  const [a, b] = await Promise.all([queue(till), queue(till)])
  const c = await queue(till)
  expect([a, b, c].map(({ sale }) => sale.number).toSorted()).toEqual(["SH1-R1-X00001", "SH1-R1-X00002", "SH1-R1-X00007"])
  expect(c.payload.number).toBe(c.sale.number)
  await expect(queue(till)).rejects.toThrow(NO_NUMBERS)
  expect(await countersFor(till, ["shift-1", "other"])).toEqual({ "shift-1": 3, other: 0 })
  expect(await outboxFor(till, "u-cashier")).toHaveLength(3)
  expect(await outboxFor(till, "u-other")).toHaveLength(0)
})

test("a till picks up after the numbers the server has already seen from this shift", async () => {
  const till = freshTill()
  const clientId = newId()
  const entry = await queueOfflineSale(till, { shift: { ...shift, offlineNext: 2 }, cashierId: "u-cashier", sale: { id: clientId, items: [] }, payload: { clientId, soldAt: Date.now() } })
  expect(entry.sale.number).toBe("SH1-R1-X00007")
})

test("uploading clears what the server took, keeps what it refused, and stops when the network drops", async () => {
  const till = freshTill()
  const [first, refused, third] = [await queue(till), await queue(till), await queue(till)]
  const sent = []
  const result = await flushOutbox(till, {
    cashierId: "u-cashier",
    send: async (payload) => (sent.push(payload.clientId), payload.clientId === refused.clientId ? { error: "Unknown item" } : { sale: { id: payload.clientId } }),
  })
  expect(result).toEqual({ uploaded: 2, failed: 1 })
  expect(sent).toEqual([first.clientId, refused.clientId, third.clientId])
  expect(await outboxFor(till, "u-cashier")).toMatchObject([{ clientId: refused.clientId, status: "failed", error: "Unknown item" }])

  const again = await flushOutbox(till, { cashierId: "u-cashier", send: async () => ({ sale: {} }) })
  expect(again).toEqual({ uploaded: 0, failed: 0 })
  await retryEntry(till, refused.clientId)
  await expect(flushOutbox(till, { cashierId: "u-cashier", send: async () => Promise.reject(new TypeError("Failed to fetch")) })).rejects.toThrow("Failed to fetch")
  expect(await outboxFor(till, "u-cashier")).toMatchObject([{ clientId: refused.clientId, status: "pending" }])
})

test("the last ledger each person loaded is kept for opening the till offline", async () => {
  const till = freshTill()
  await saveSnapshot(till, "u-cashier", JSON.stringify({ stock: { v1: 3 } }))
  expect(JSON.parse((await readSnapshot(till, "u-cashier")).text)).toEqual({ stock: { v1: 3 } })
  expect(await readSnapshot(till, "u-other")).toBeUndefined()
})
