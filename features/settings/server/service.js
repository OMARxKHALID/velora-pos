import { z } from "zod"
import { UserError, parseInput } from "@/lib/errors"
import { changesBetween, writeAudit } from "@/lib/db/audit"
import { COLLECTIONS as C } from "@/lib/db/collections"
import { withTransaction } from "@/lib/db/transaction"

const FIELDS = ["taxEnabled", "taxLabel", "taxRate", "productDiscountEnabled", "cartDiscountEnabled", "customerInfoEnabled", "lowStockThreshold", "paymentMethods"]

const patchSchema = z
  .object({
    taxEnabled: z.boolean(),
    taxLabel: z.string().trim().min(1, { error: "Enter a tax name" }).max(20),
    taxRate: z.number().min(0).max(100).refine((value) => Number.isInteger(Math.round(value * 100)) && Math.abs(value * 100 - Math.round(value * 100)) < 1e-9, { error: "Use at most two decimals" }),
    productDiscountEnabled: z.boolean(),
    cartDiscountEnabled: z.boolean(),
    customerInfoEnabled: z.boolean(),
    lowStockThreshold: z.number().int().min(1).max(99),
    paymentMethods: z.object({ card: z.boolean(), jazzcash: z.boolean(), easypaisa: z.boolean(), bank: z.boolean() }),
  })
  .partial()
  .strict()

export const updateSettings = async ({ db, client, user, shopId, at = new Date() }, patch) => {
  const updates = parseInput(patchSchema, patch)
  if (!Object.keys(updates).length) throw new UserError("Nothing to change")
  return withTransaction(client, async (session) => {
    const before = await db.collection(C.settings).findOne({ _id: shopId }, { session })
    if (!before) throw new UserError("This shop has no settings yet")
    const after = { ...before, ...updates }
    await db.collection(C.settings).updateOne({ _id: shopId }, { $set: updates }, { session })
    const changes = changesBetween(before, after, FIELDS)
    if (Object.keys(changes).length) await writeAudit(db, session, { shopId, userId: user.id, kind: "settings.update", target: shopId, changes, at })
    const { _id, shopId: _shop, ...settings } = after
    return settings
  })
}
