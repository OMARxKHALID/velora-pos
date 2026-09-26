import { beforeAll, describe, expect, test } from "bun:test"
import { hasTestDatabase, useTestDatabase } from "@/test/db"
import { loadDocuments, seedDocuments } from "@/features/sample-data/lib/seed-documents"
import { ledgerSnapshot } from "@/features/ledger/server/snapshot"
import { COLLECTIONS as C } from "@/server/db/collections"
import { deleteShop, saveRegister, saveShop } from "./service"

const FIRST = "shop-shoes"

describe.skipIf(!hasTestDatabase)("shops and counters", () => {
  const context = useTestDatabase()
  const owner = () => ({ db: context.db, client: context.client, user: { id: "u-admin", role: "admin" } })

  beforeAll(async () => {
    await loadDocuments(context.db, seedDocuments(new Date(2026, 8, 16, 18).getTime()))
  })

  test("the shop can be edited but no new shop can be added", async () => {
    await expect(saveShop(owner(), { name: "Second Shop" })).rejects.toThrow("cannot be added")
    const shop = await saveShop(owner(), { shopId: FIRST, name: "  Velora   Shoes ", city: "Karachi", ntn: "1234567-8" })
    expect(shop).toMatchObject({ id: FIRST, code: "SH1", name: "Velora Shoes", city: "Karachi", active: true })
    expect(await context.db.collection(C.shops).countDocuments()).toBe(1)
    await expect(saveShop(owner(), { shopId: "shop-missing", name: "Third" })).rejects.toThrow("Shop not found")
    await expect(saveShop(owner(), { shopId: FIRST, name: "Velora Shoes", ntn: "12" })).rejects.toThrow("NTN")
    await expect(saveShop(owner(), { shopId: FIRST, name: "Velora Shoes", strn: "123" })).rejects.toThrow("STRN")
    await expect(saveShop(owner(), { shopId: FIRST, name: "Velora Shoes", phone: "abc" })).rejects.toThrow("phone")
  })

  test("counters get their own code, a unique POSID and printer settings", async () => {
    const counter = await saveRegister(owner(), { shopId: FIRST, name: "Counter 2", fbrPosId: "110015", autoPrint: true, copies: 2 })
    expect(counter).toMatchObject({ code: "SH1-R2", fbrPosId: "110015", autoPrint: true, copies: 2 })
    await expect(saveRegister(owner(), { shopId: FIRST, name: "Counter 3", fbrPosId: "110015" })).rejects.toThrow("already uses")
    await expect(saveRegister(owner(), { shopId: FIRST, name: "Counter 3", copies: 5 })).rejects.toThrow("one or two")
    await expect(saveRegister(owner(), { shopId: FIRST, name: "Counter 3", fbrPosId: "12" })).rejects.toThrow("POSID")
    const edited = await saveRegister(owner(), { registerId: counter.id, shopId: FIRST, name: "Till", fbrPosId: "110015", drawerOnCash: false })
    expect(edited).toMatchObject({ code: "SH1-R2", name: "Till", drawerOnCash: false, autoPrint: true })
  })

  test("the snapshot carries every shop with its settings and counters", async () => {
    const snapshot = await ledgerSnapshot(context.db, { user: { id: "u-admin", role: "admin" } })
    expect(snapshot.shops.map(({ code }) => code)).toEqual(["SH1"])
    expect(snapshot.shops[0]).toMatchObject({ city: "Karachi", ntn: "1234567-8", settings: { cashRounding: 1 } })
    expect(snapshot.registers.find(({ code }) => code === "SH1-R2")).toMatchObject({ name: "Till", fbrPosId: "110015", copies: 2 })
  })

  test("only an empty shop can be deleted, never the last one, and a shop with an open shift cannot close", async () => {
    await expect(deleteShop(owner(), { shopId: FIRST })).rejects.toThrow("last shop")
    const second = { _id: "shop-second", code: "SH2", name: "Second Shop", active: true }
    await context.db.collection(C.shops).insertOne(second)
    await context.db.collection(C.registers).insertOne({ _id: "reg-second", shopId: second._id, code: "SH2-R1", name: "Counter 1" })
    await expect(deleteShop(owner(), { shopId: FIRST })).rejects.toThrow("products or history")
    const closed = await saveShop(owner(), { shopId: second._id, name: "Second Shop", active: false })
    expect(closed.active).toBe(false)
    await context.db.collection(C.users).insertOne({ _id: "u-x", shopIds: [second._id], role: "cashier" })
    await expect(deleteShop(owner(), { shopId: second._id })).rejects.toThrow("staff")
    await context.db.collection(C.users).deleteOne({ _id: "u-x" })
    await deleteShop(owner(), { shopId: second._id })
    expect(await context.db.collection(C.registers).countDocuments({ shopId: second._id })).toBe(0)
    await context.db.collection(C.shifts).insertOne({ _id: "s-open", shopId: FIRST, status: "open", registerId: "r" })
    await expect(saveShop(owner(), { shopId: FIRST, name: "Velora Shoes", active: false })).rejects.toThrow("open shift")
    await context.db.collection(C.shifts).deleteOne({ _id: "s-open" })
  })
})
