import { beforeAll, describe, expect, test } from "bun:test"
import { hasTestDatabase, useTestDatabase } from "@/test/db"
import { movementsPage } from "@/features/catalog/server/queries"
import { loadDocuments, seedDocuments } from "@/features/sample-data/lib/seed-documents"
import { staffActivity } from "@/features/staff/server/staff"
import { COLLECTIONS as C } from "@/lib/db/collections"
import { findSale, saleDetail, salesPage } from "./queries"

const SHOP = "shop-shoes"
const now = Date.parse("2026-09-16T13:00:00Z")
const owner = { id: "u-admin", role: "admin" }
const cashier = { id: "u-cashier", role: "cashier" }

describe.skipIf(!hasTestDatabase)("sales and stock history on the server", () => {
  const context = useTestDatabase()

  beforeAll(async () => {
    await loadDocuments(context.db, seedDocuments(now))
    await context.db.collection(C.sales).updateOne({}, { $set: { payments: [{ method: "card", amount: 1, reference: "048291" }] } })
    await context.db.collection(C.sales).insertOne({ _id: "someone-else", number: "SH1-R1-999999", shopId: SHOP, cashierId: "u-cashier-2", soldAt: new Date(now - 1000), items: [{ productName: "Other", unitCost: 1 }], payments: [] })
  })

  test("pages newest first with an exact total", async () => {
    const all = await context.db.collection(C.sales).countDocuments({ shopId: SHOP })
    const first = await salesPage(context.db, { shopIds: [SHOP], viewer: owner, range: "all", now, page: 1, pageSize: 25 })
    const second = await salesPage(context.db, { shopIds: [SHOP], viewer: owner, range: "all", now, page: 2, pageSize: 25 })
    expect(first.total).toBe(all)
    expect(first.rows).toHaveLength(25)
    expect(first.rows[24].soldAt.getTime()).toBeGreaterThanOrEqual(second.rows[0].soldAt.getTime())
    expect(first.refunds.every(({ saleId }) => first.rows.some(({ id }) => id === saleId))).toBe(true)
  })

  test("filters by day in the shop's time zone, by cashier and by search", async () => {
    const today = await salesPage(context.db, { shopIds: [SHOP], viewer: owner, range: "today", now })
    const start = new Date("2026-09-15T19:00:00Z")
    expect(today.total).toBe(await context.db.collection(C.sales).countDocuments({ soldAt: { $gte: start } }))
    const mine = await salesPage(context.db, { shopIds: [SHOP], viewer: owner, range: "all", cashierId: "u-cashier-2", now })
    expect(mine.rows.map(({ id }) => id)).toEqual(["someone-else"])
    const sample = await context.db.collection(C.sales).findOne({ customerName: { $type: "string" } })
    const byCustomer = await salesPage(context.db, { shopIds: [SHOP], viewer: owner, range: "all", q: sample.customerName.toLowerCase(), now })
    expect(byCustomer.rows.every(({ customerName }) => customerName === sample.customerName)).toBe(true)
    const weird = await salesPage(context.db, { shopIds: [SHOP], viewer: owner, range: "all", q: "a.*(", now })
    expect(weird.total).toBe(0)
  })

  test("a cashier sees only their own sales, without cost prices", async () => {
    const page = await salesPage(context.db, { shopIds: [SHOP], viewer: cashier, range: "all", cashierId: "u-cashier-2", now })
    expect(page.rows.every(({ cashierId }) => cashierId === "u-cashier")).toBe(true)
    expect(page.rows.flatMap(({ items }) => items).every((item) => !("unitCost" in item))).toBe(true)
    expect(await saleDetail(context.db, { saleId: "someone-else", shopIds: [SHOP], viewer: cashier })).toBeNull()
    expect((await saleDetail(context.db, { saleId: "someone-else", shopIds: [SHOP], viewer: owner })).sale.number).toBe("SH1-R1-999999")
    expect(await saleDetail(context.db, { saleId: "someone-else", shopIds: ["shop-other"], viewer: owner })).toBeNull()
  })

  test("receipts are found by number and card slips by reference", async () => {
    expect(await findSale(context.db, { shopIds: [SHOP], viewer: owner, number: "sh1-r1-999999" })).toEqual({ id: "someone-else", number: "SH1-R1-999999" })
    expect(await findSale(context.db, { shopIds: [SHOP], viewer: cashier, number: "SH1-R1-999999" })).toBeNull()
    expect(await findSale(context.db, { shopIds: [SHOP], viewer: cashier, reference: " 048291 " })).toMatchObject({ number: expect.stringMatching(/^SH1-R1-/) })
    expect(await findSale(context.db, { shopIds: [SHOP], viewer: cashier, reference: "0482" })).toBeNull()
  })

  test("stock history searches products, people and receipts on the server", async () => {
    const byProduct = await movementsPage(context.db, { shopIds: [SHOP], q: "noir oxford" })
    expect(byProduct.total).toBeGreaterThan(0)
    expect(byProduct.rows.every(({ productName }) => productName === "Velora Noir Oxford")).toBe(true)
    const receipt = (await context.db.collection(C.movements).findOne({ type: "sale" })).ref.number
    expect((await movementsPage(context.db, { shopIds: [SHOP], q: receipt })).rows.map(({ ref }) => ref.number)).toContain(receipt)
    expect((await movementsPage(context.db, { shopIds: [SHOP], q: "zzzz-nothing" })).total).toBe(0)
  })

  test("staff activity is counted by the database", async () => {
    const activity = await staffActivity(context.db)
    expect(activity["u-cashier"].sales).toBe(await context.db.collection(C.sales).countDocuments({ cashierId: "u-cashier" }))
    expect(activity["u-cashier"].shifts).toBe(await context.db.collection(C.shifts).countDocuments({ cashierId: "u-cashier" }))
    expect(activity["u-manager"].lastActive).toBeGreaterThan(0)
  })
})
