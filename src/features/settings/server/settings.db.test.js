import { beforeAll, describe, expect, test } from "bun:test"
import { hasTestDatabase, useTestDatabase } from "@/test/db"
import { loadDocuments, seedDocuments } from "@/features/sample-data/lib/seed-documents"
import { COLLECTIONS as C } from "@/server/db/collections"
import { updateSettings } from "./service"

const SHOP = "shop-shoes"

describe.skipIf(!hasTestDatabase)("shop settings", () => {
  const context = useTestDatabase()
  const owner = () => ({ db: context.db, client: context.client, user: { id: "u-admin", role: "admin" }, shopId: SHOP })

  beforeAll(async () => {
    await loadDocuments(context.db, seedDocuments(new Date(2026, 8, 16, 18).getTime()))
  })

  test("till layout, rounding, payments and tax mode are checked", async () => {
    const saved = await updateSettings(owner(), { posColumns: 5, cashRounding: 10, pricesIncludeTax: true, paymentMethods: { card: true, jazzcash: true, easypaisa: false, bank: false } })
    expect(saved).toMatchObject({ posColumns: 5, cashRounding: 10, pricesIncludeTax: true })
    await expect(updateSettings(owner(), { posColumns: 2 })).rejects.toThrow()
    await expect(updateSettings(owner(), { cashRounding: 7 })).rejects.toThrow()
    await expect(updateSettings(owner(), { paymentMethods: { card: true } })).rejects.toThrow()
  })

  test("receipt changes merge into what is already saved", async () => {
    await updateSettings(owner(), { receipt: { title: "VELORA SHOES", paper: "58" } })
    const saved = await updateSettings(owner(), { receipt: { footer: "Come again" } })
    expect(saved.receipt).toEqual({ title: "VELORA SHOES", paper: "58", footer: "Come again" })
    await expect(updateSettings(owner(), { receipt: { paper: "100" } })).rejects.toThrow()
    await expect(updateSettings(owner(), { receipt: { unknown: true } })).rejects.toThrow()
  })

  test("FBR reporting needs the shop's NTN and every counter's POSID first", async () => {
    await expect(updateSettings(owner(), { fbrEnabled: true })).rejects.toThrow("NTN")
    await context.db.collection(C.shops).updateOne({ _id: SHOP }, { $set: { ntn: "1234567-8" } })
    await expect(updateSettings(owner(), { fbrEnabled: true })).rejects.toThrow("POSID")
    await context.db.collection(C.registers).updateMany({ shopId: SHOP }, { $set: { fbrPosId: "110014" } })
    expect(await updateSettings(owner(), { fbrEnabled: true })).toMatchObject({ fbrEnabled: true })
    expect(await updateSettings(owner(), { fbrEnabled: false })).toMatchObject({ fbrEnabled: false })
  })
})
