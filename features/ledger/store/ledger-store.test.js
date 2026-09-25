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
