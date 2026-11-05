import "server-only"
import { z } from "zod"
import { applyStockCount } from "@/features/ledger/lib/rules"
import { COLLECTIONS as C, fromDoc } from "@/server/db/collections"
import { withTransaction } from "@/server/db/transaction"
import { UserError, parseInput, userFacing } from "@/shared/lib/errors"
import { newId } from "@/shared/lib/id"
import { moveStockMany, shopVariants } from "./stock"

const COUNT_LOOKBACK_MS = 24 * 60 * 60 * 1000

const stockWhenCounted = async (db, session, { shopId, counts, rows, at }) => {
  const stock = Object.fromEntries(rows.map(({ variantId, quantity }) => [variantId, quantity]))
  const timeOf = Object.fromEntries(counts.filter(({ countedAgo }) => countedAgo).map(({ variantId, countedAgo }) => [variantId, new Date(at.getTime() - Math.min(countedAgo, COUNT_LOOKBACK_MS))]))
  const ids = Object.keys(timeOf)
  if (!ids.length) return stock
  const since = new Date(Math.min(...Object.values(timeOf).map((date) => date.getTime())))
  const later = await db.collection(C.movements).find({ shopId, variantId: { $in: ids }, createdAt: { $gt: since } }, { session, projection: { variantId: 1, quantity: 1, createdAt: 1 } }).toArray()
  for (const { variantId, quantity, createdAt } of later) if (createdAt > timeOf[variantId]) stock[variantId] = (stock[variantId] ?? 0) - quantity
  return stock
}

const countSchema = z.object({
  counts: z
    .array(
      z.object({
        variantId: z.string().min(1).max(80),
        counted: z.number().int({ error: "Counts must be whole numbers" }).min(0, { error: "Counts must be whole numbers" }).max(100000),
        countedAgo: z.number().int().min(0).optional(),
      })
    )
    .min(1, { error: "Scan at least one item" })
    .max(3000, { error: "Count at most 3,000 items at a time" }),
})

export const countStock = async ({ db, client, user, shopId, at = new Date() }, input) => {
  const { counts } = parseInput(countSchema, input)
  if (new Set(counts.map(({ variantId }) => variantId)).size !== counts.length) throw new UserError("Each item can only be counted once")
  const id = newId()
  return withTransaction(client, async (session) => {
    const ids = counts.map(({ variantId }) => variantId)
    const variants = await shopVariants(db, session, shopId, ids)
    const rows = await db.collection(C.stock).find({ shopId, variantId: { $in: ids } }, { session }).toArray()
    const stock = await stockWhenCounted(db, session, { shopId, counts, rows, at })
    const { record } = userFacing(() =>
      applyStockCount(
        { variants: Object.values(variants).map(fromDoc), products: [], stock, movements: [] },
        { counts: counts.map(({ variantId, counted }) => ({ variantId, counted })), userId: user.id, at, id }
      )
    )
    await moveStockMany(
      db,
      session,
      record.lines
        .filter(({ expected, counted }) => expected !== counted)
        .map(({ variantId, expected, counted }) => ({ shopId, variantId, quantity: counted - expected, type: "adjustment", unitCost: variants[variantId].cost, reason: "count", ref: { kind: "Count", id, number: null }, userId: user.id, at }))
    )
    return record
  })
}
