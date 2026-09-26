import { expect, test } from "bun:test"
import { createLedgerStore, parseLedger } from "./ledger-store"

const snapshot = (overrides = {}) => ({ products: [], variants: [], stock: {}, sales: [], refunds: [], shifts: [], movements: [], purchases: [], heldCarts: [], settings: { taxEnabled: false }, ...overrides })

test("a change goes to the server, then the screen reloads what the server now has", async () => {
  const calls = []
  let loads = 0
  const store = createLedgerStore({
    actions: { openShift: async (input) => (calls.push(input), { ok: true, record: { id: "s1" } }) },
    loadLedger: async () => (loads += 1, snapshot({ shifts: [{ id: "s1", status: "open" }] })),
  })
  const record = await store.getState().openShift({ openingCash: 0, clientId: "c-1" })
  expect(record).toEqual({ id: "s1" })
  expect(calls).toEqual([{ openingCash: 0, clientId: "c-1" }])
  expect(loads).toBe(1)
  expect(store.getState()).toMatchObject({ hydrated: true, shifts: [{ id: "s1" }] })
})

test("a refused change throws the server's message and keeps the old data", async () => {
  const store = createLedgerStore({ actions: { recordSale: async () => ({ error: "Only 0 left of Nike Air Max" }) }, loadLedger: async () => snapshot() })
  await expect(store.getState().recordSale({})).rejects.toThrow("Only 0 left")
  const offline = createLedgerStore({ actions: { recordSale: async () => Promise.reject(new TypeError("fetch failed")) }, loadLedger: async () => snapshot() })
  await expect(offline.getState().recordSale({})).rejects.toThrow("Could not reach the server")
})

test("settings change on screen at once and roll back if the server refuses", async () => {
  const store = createLedgerStore({ actions: { updateSettings: async () => ({ error: "Use at most two decimals" }) }, loadLedger: async () => snapshot() })
  store.setState({ settings: { taxRate: 5 } })
  const pending = store.getState().setSettings({ taxRate: 5.555 })
  expect(store.getState().settings.taxRate).toBe(5.555)
  await expect(pending).rejects.toThrow("two decimals")
  expect(store.getState().settings.taxRate).toBe(5)
})

test("loading twice at once asks the server once; a failed load is shown, not thrown", async () => {
  let loads = 0
  const store = createLedgerStore({ loadLedger: async () => (loads += 1, snapshot()) })
  await Promise.all([store.getState().load(), store.getState().load()])
  expect(loads).toBe(1)
  const broken = createLedgerStore({ loadLedger: async () => Promise.reject(new Error("Your session has ended. Sign in again.")) })
  await broken.getState().load()
  expect(broken.getState()).toMatchObject({ hydrated: false, loadError: "Your session has ended. Sign in again." })
})

test("dates from the server come back as the times the screens expect", () => {
  const parsed = parseLedger(JSON.stringify({ sales: [{ soldAt: "2026-09-25T10:00:00.000Z", number: "SH1-R1-000001" }] }))
  expect(parsed.sales[0]).toEqual({ soldAt: Date.parse("2026-09-25T10:00:00.000Z"), number: "SH1-R1-000001" })
})

const offlineShop = () => {
  const product = { id: "p1", name: "Aurum Runner", status: "active", discountPct: 0 }
  const variant = { id: "v1", productId: "p1", sku: "AR-42", price: 1250000, active: true, attributes: { color: "Black", size: 42 } }
  const shift = { id: "s1", status: "open", cashierId: "u-cashier", shopId: "shop-shoes", registerId: "reg-1", registerCode: "SH1-R1", openingCash: 0, receiptBlocks: [{ from: 1, to: 30 }] }
  return snapshot({ products: [product], variants: [variant], stock: { v1: 3 }, shifts: [shift], settings: { taxEnabled: false, productDiscountEnabled: true, cartDiscountEnabled: true } })
}

test("with no connection the till keeps selling, then uploads each sale once when the server is back", async () => {
  const { IDBFactory, IDBKeyRange } = await import("fake-indexeddb")
  const { createTillDb } = await import("@/features/offline/lib/till-db")
  const till = createTillDb("till-store-test", { indexedDB: new IDBFactory(), IDBKeyRange })
  const uploads = []
  let serverUp = false
  const store = createLedgerStore({
    user: { id: "u-cashier", role: "cashier" },
    till,
    actions: { recordSale: async () => Promise.reject(new TypeError("Failed to fetch")), reserveReceipts: async () => ({ ok: true, record: {} }) },
    loadLedger: async () => {
      if (!serverUp) throw new Error("Could not reach the server")
      return { ...offlineShop(), stock: { v1: 3 - uploads.length } }
    },
    sendSale: async (payload) => {
      if (!serverUp) throw new TypeError("Failed to fetch")
      uploads.push(payload)
      return { sale: { id: payload.clientId } }
    },
  })
  store.setState({ ...offlineShop(), serverStock: { v1: 3 }, hydrated: true })

  const input = { clientId: "c-1", shiftId: "s1", lines: [{ variantId: "v1", quantity: 1 }], payments: [{ method: "cash", amount: 1300000 }] }
  const sale = await store.getState().recordSale(input)
  expect(sale).toMatchObject({ number: "SH1-R1-X00001", total: 1250000, change: 50000, syncedAt: null, offline: true })
  expect(store.getState()).toMatchObject({ offline: true, stock: { v1: 2 }, pending: [{ clientId: "c-1", status: "pending" }] })

  const second = await store.getState().recordSale({ ...input, clientId: "c-2" })
  expect(second.number).toBe("SH1-R1-X00002")
  expect(store.getState().stock.v1).toBe(1)

  await store.getState().syncOutbox()
  expect(uploads).toHaveLength(0)
  expect(store.getState()).toMatchObject({ offline: true, pending: [{ clientId: "c-1" }, { clientId: "c-2" }] })

  serverUp = true
  store.getState().setOffline(false)
  await store.getState().syncOutbox()
  expect(uploads.map(({ number }) => number)).toEqual(["SH1-R1-X00001", "SH1-R1-X00002"])
  expect(uploads[0]).toMatchObject({ clientId: "c-1", total: 1250000, lines: [{ variantId: "v1", quantity: 1, unitPrice: 1250000, productDiscountPct: 0 }], pricing: { taxEnabled: false } })
  expect(store.getState()).toMatchObject({ pending: [], stock: { v1: 1 }, offline: false })
})

test("offline, the till opens from what it last loaded", async () => {
  const { IDBFactory, IDBKeyRange } = await import("fake-indexeddb")
  const { createTillDb } = await import("@/features/offline/lib/till-db")
  const till = createTillDb("till-snapshot-test", { indexedDB: new IDBFactory(), IDBKeyRange })
  const user = { id: "u-cashier", role: "cashier" }
  const online = createLedgerStore({ user, till, loadLedger: async () => offlineShop() })
  await online.getState().load()
  await new Promise((resolve) => setTimeout(resolve, 20))
  const offline = createLedgerStore({ user, till, loadLedger: async () => Promise.reject(new Error("Could not reach the server")) })
  await offline.getState().load()
  expect(offline.getState()).toMatchObject({ hydrated: true, offline: true, stock: { v1: 3 }, shifts: [{ id: "s1" }] })
  expect(offline.getState().savedAt).toBeNumber()
})
