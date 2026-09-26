import { z } from "zod"
import { applyStockCount } from "@/features/ledger/lib/rules"
import { COLLECTIONS as C, fromDoc } from "@/server/db/collections"
import { withTransaction } from "@/server/db/transaction"
import { UserError, parseInput } from "@/shared/lib/errors"
import { newId } from "@/shared/lib/id"
import { moveStockMany, shopVariants } from "./stock"

const countSchema = z.object({
  counts: z
    .array(z.object({ variantId: z.string().min(1).max(80), counted: z.number().int({ error: "Counts must be whole numbers" }).min(0, { error: "Counts must be whole numbers" }).max(100000) }))
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
    let record
    try {
      ;({ record } = applyStockCount(
        { variants: Object.values(variants).map(fromDoc), products: [], stock: Object.fromEntries(rows.map(({ variantId, quantity }) => [variantId, quantity])), movements: [] },
        { counts, userId: user.id, at, id }
      ))
    } catch (error) {
      throw new UserError(error.message)
    }
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
