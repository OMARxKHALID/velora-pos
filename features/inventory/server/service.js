import { z } from "zod"
import { UserError } from "@/features/auth/server/session-errors"
import { COLLECTIONS as C } from "@/lib/db/collections"
import { withTransaction } from "@/lib/db/transaction"
import { newId } from "@/lib/id"
import { addReasons, removeReasons } from "../schemas"
import { moveStock, shopVariants } from "./stock"

const deliverySchema = z.object({
  supplier: z.string().trim().min(2, { error: "Enter the supplier name" }).max(80),
  lines: z
    .array(
      z.object({
        variantId: z.string().min(1),
        quantity: z.number().int({ error: "Whole pairs only" }).min(1, { error: "At least 1" }).max(500, { error: "At most 500 at a time" }),
        unitCost: z.number().int().min(0).optional(),
      })
    )
    .min(1, { error: "Scan or add at least one item" })
    .max(500),
})

const adjustmentSchema = z
  .object({
    variantId: z.string().min(1),
    quantity: z.number().int({ error: "Whole pairs only" }).refine((value) => value !== 0 && Math.abs(value) <= 500, { error: "Between 1 and 500 pairs" }),
    reason: z.string(),
    note: z.string().trim().max(200).default(""),
  })
  .refine(({ quantity, reason }) => (quantity < 0 ? reason in removeReasons : reason in addReasons), { error: "Pick a reason", path: ["reason"] })

const parse = (schema, value) => {
  const result = schema.safeParse(value)
  if (!result.success) throw new UserError(result.error.issues[0].message)
  return result.data
}

export const receiveDelivery = async ({ db, client, user, shopId, at = new Date() }, input) => {
  const { supplier, lines } = parse(deliverySchema, input)
  return withTransaction(client, async (session) => {
    const variants = await shopVariants(db, session, shopId, lines.map(({ variantId }) => variantId))
    const items = lines.map((line) => ({ ...line, unitCost: line.unitCost ?? variants[line.variantId].cost }))
    const purchase = {
      _id: newId(),
      shopId,
      supplier,
      items,
      total: items.reduce((sum, { quantity, unitCost }) => sum + quantity * unitCost, 0),
      receivedBy: user.id,
      receivedAt: at,
    }
    await db.collection(C.purchases).insertOne(purchase, { session })
    for (const { variantId, quantity, unitCost } of items) {
      await moveStock(db, session, { shopId, variantId, quantity, type: "purchase", unitCost, ref: { kind: "Purchase", id: purchase._id, number: supplier }, userId: user.id, at })
    }
    return { id: purchase._id, pairs: items.reduce((sum, { quantity }) => sum + quantity, 0), total: purchase.total }
  })
}

export const adjustStock = async ({ db, client, user, shopId, at = new Date() }, input) => {
  const { variantId, quantity, reason, note } = parse(adjustmentSchema, input)
  return withTransaction(client, async (session) => {
    const variants = await shopVariants(db, session, shopId, [variantId])
    const movement = await moveStock(db, session, { shopId, variantId, quantity, type: "adjustment", unitCost: variants[variantId].cost, reason, note: note || null, userId: user.id, at })
    return { id: movement._id, balanceAfter: movement.balanceAfter }
  })
}
