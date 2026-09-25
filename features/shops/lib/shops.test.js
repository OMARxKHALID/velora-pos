import { expect, test } from "bun:test"
import { applyOpenShift, applySale } from "@/features/ledger/lib/rules"
import { createSeed } from "@/features/sample-data/lib/seed"
import { ALL_SHOPS, applyDeleteShop, applySaveRegister, applySaveShop, scopeState, settingsFor, shopName, shopRegisters } from "./shops"

test("scoping to a shop keeps only that shop's records", () => {
  const state = createSeed()
  const other = { ...state, sales: [...state.sales, { ...state.sales[0], id: "x", shopId: "shop-second" }] }
  expect(scopeState(other, ALL_SHOPS).sales).toHaveLength(state.sales.length + 1)
  const scoped = scopeState(other, state.shops[0].id)
  expect(scoped.sales).toHaveLength(state.sales.length)
  expect(scoped.products).toHaveLength(state.products.length)
  expect(scopeState(state, "shop-none").variants).toHaveLength(0)
})

test("shop names come from the shops the server sent", () => {
  const shops = [{ id: "shop-shoes", name: "Velora Shoes" }]
  expect(shopName(ALL_SHOPS, shops)).toBe("All shops")
  expect(shopName("shop-shoes", shops)).toBe("Velora Shoes")
  expect(shopName("shop-gone", shops)).toBe("Shop")
})

test("a new shop gets the next code and its first counter", () => {
  const state = createSeed()
  const { state: next, record } = applySaveShop(state, { name: "Second Shop", city: "Karachi", ntn: "1234567-8" })
  expect(record.code).toBe("SH2")
  expect(shopRegisters(next.registers, record.id).map(({ code }) => code)).toEqual(["SH2-R1"])
  expect(() => applySaveShop(next, { name: "second shop" })).toThrow("already exists")
  expect(() => applySaveShop(next, { name: "Third", ntn: "12" })).toThrow("NTN")
})

test("counters get their own code, a unique POSID and printer settings", () => {
  const state = createSeed()
  const shopId = state.shops[0].id
  const { state: next, record } = applySaveRegister(state, { shopId, name: "Counter 2", fbrPosId: "110015", autoPrint: true, copies: 2 })
  expect(record).toMatchObject({ code: "SH1-R2", fbrPosId: "110015", autoPrint: true, copies: 2 })
  expect(() => applySaveRegister(next, { shopId, name: "Counter 3", fbrPosId: "110015" })).toThrow("already uses")
  expect(() => applySaveRegister(next, { shopId, name: "Counter 3", copies: 5 })).toThrow("one or two")
})

test("each counter numbers its own receipts", () => {
  const state = createSeed(new Date(2026, 8, 16, 9).getTime())
  const { state: withCounter, record: counter } = applySaveRegister(state, { shopId: state.shops[0].id, name: "Counter 2" })
  const variant = withCounter.variants.find(({ id }) => (withCounter.stock[id] ?? 0) > 0)
  const { state: opened, record: shift } = applyOpenShift(withCounter, { cashierId: "u-cashier", openingCash: 0, registerId: counter.id, at: Date.now() })
  const { record: sale } = applySale(opened, {
    lines: [{ variantId: variant.id, quantity: 1 }],
    payments: [{ method: "card", amount: variant.price }],
    cashierId: "u-cashier",
    shiftId: shift.id,
    registerId: counter.id,
    registerCode: counter.code,
    at: Date.now(),
  })
  expect(sale.number).toBe("SH1-R2-000001")
})

test("only an empty shop can be deleted, never the last one", () => {
  const state = createSeed()
  expect(() => applyDeleteShop(state, { shopId: state.shops[0].id })).toThrow("last shop")
  const { state: withNew, record } = applySaveShop(state, { name: "Pop-up" })
  const { state: after } = applyDeleteShop(withNew, { shopId: record.id })
  expect(after.shops.map(({ id }) => id)).toEqual([state.shops[0].id])
  expect(after.registers.some(({ shopId }) => shopId === record.id)).toBe(false)
  const staffed = { ...withNew, staff: { x: { id: "x", role: "cashier", shopId: record.id } } }
  expect(() => applyDeleteShop(staffed, { shopId: record.id })).toThrow("staff")
  const { state: busy } = applySaveShop(withNew, { name: "Second" })
  const withHistory = { ...busy, shops: [...busy.shops], products: [...busy.products, { ...busy.products[0], id: "p-new", shopId: record.id }] }
  expect(() => applyDeleteShop(withHistory, { shopId: record.id })).toThrow("Close it instead")
})

test("a shop's settings come from its own document, falling back to the first shop", () => {
  const shops = [
    { id: "a", settings: { taxEnabled: true, taxRate: 18 } },
    { id: "b", settings: { taxEnabled: false, taxRate: 0 } },
  ]
  expect(settingsFor(shops, "b")).toMatchObject({ taxEnabled: false })
  expect(settingsFor(shops, "a")).toMatchObject({ taxRate: 18 })
  expect(settingsFor(shops, "all")).toMatchObject({ taxRate: 18 })
  expect(settingsFor([], "a")).toMatchObject({ taxEnabled: false, cashRounding: 1 })
})
