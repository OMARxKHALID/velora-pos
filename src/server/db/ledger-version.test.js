import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, test } from "bun:test"
import { hasTestDatabase, useTestDatabase } from "@/test/db"
import { COLLECTIONS as C } from "./collections"
import { bumpAllLedgers, bumpLedger, ledgerStamp } from "./ledger-version"

const FEATURES = join(import.meta.dir, "../../features")
const LEAVES_LEDGER_ALONE = { auth: "signing in and discount approvals change no ledger data", staff: "the staff list comes from the layout, not the ledger" }

test("every server action that can change ledger data bumps the ledger version", () => {
  const actionFiles = readdirSync(FEATURES).flatMap((feature) => {
    try {
      return [[feature, readFileSync(join(FEATURES, feature, "actions.js"), "utf8")]]
    } catch {
      return []
    }
  })
  expect(actionFiles.length).toBeGreaterThan(5)
  for (const [feature, source] of actionFiles) {
    if (LEAVES_LEDGER_ALONE[feature]) continue
    const bumps = /recordAction\(/.test(source) || /bump(All)?Ledgers?\(/.test(source)
    expect({ feature, bumps }).toEqual({ feature, bumps: true })
    const exported = [...source.matchAll(/^export const (\w+)/gm)].map(([, name]) => name)
    const wrapped = [...source.matchAll(/^export const (\w+) = (?:(?!^export )[\s\S])*?(recordAction|asOwner|actionResult)\(/gm)].map(([, name]) => name)
    expect({ feature, unwrapped: exported.filter((name) => !wrapped.includes(name)) }).toEqual({ feature, unwrapped: [] })
  }
})

describe.skipIf(!hasTestDatabase)("ledger version", () => {
  const context = useTestDatabase()
  const cashier = { id: "u-cashier", role: "cashier", shopId: "shop-a" }
  const other = { id: "u-other", role: "cashier", shopId: "shop-b" }
  const owner = { id: "u-admin", role: "admin", shopId: null }
  const now = Date.parse("2026-09-26T10:00:00Z")

  test("a change in one shop moves that shop's stamp and the owner's, not other shops'", async () => {
    await context.db.collection(C.shops).insertMany([{ _id: "shop-a" }, { _id: "shop-b" }])
    const before = await Promise.all([cashier, other, owner].map((user) => ledgerStamp(context.db, user, now)))
    await bumpLedger(context.db, "shop-a")
    const after = await Promise.all([cashier, other, owner].map((user) => ledgerStamp(context.db, user, now)))
    expect(after[0]).not.toBe(before[0])
    expect(after[1]).toBe(before[1])
    expect(after[2]).not.toBe(before[2])
  })

  test("a change to shops or settings moves every stamp", async () => {
    const before = await Promise.all([cashier, other, owner].map((user) => ledgerStamp(context.db, user, now)))
    await bumpAllLedgers(context.db)
    const after = await Promise.all([cashier, other, owner].map((user) => ledgerStamp(context.db, user, now)))
    after.forEach((stamp, index) => expect(stamp).not.toBe(before[index]))
  })

  test("the stamp rolls over every ten minutes even with no change", async () => {
    expect(await ledgerStamp(context.db, cashier, now)).not.toBe(await ledgerStamp(context.db, cashier, now + 10 * 60 * 1000))
  })
})
