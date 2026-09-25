import { z } from "zod"
import { UserError } from "@/features/auth/server/session-errors"
import { changesBetween, writeAudit } from "@/lib/db/audit"
import { COLLECTIONS as C } from "@/lib/db/collections"
import { withTransaction } from "@/lib/db/transaction"

const FIELDS = ["taxEnabled", "taxLabel", "taxRate", "productDiscountEnabled", "cartDiscountEnabled", "customerInfoEnabled", "lowStockThreshold"]

const patchSchema = z
  .object({
    taxEnabled: z.boolean(),
    taxLabel: z.string().trim().min(1, { error: "Enter a tax name" }).max(20),
    taxRate: z.number().min(0).max(100).refine((value) => Number.isInteger(Math.round(value * 100)) && Math.abs(value * 100 - Math.round(value * 100)) < 1e-9, { error: "Use at most two decimals" }),
    productDiscountEnabled: z.boolean(),
    cartDiscountEnabled: z.boolean(),
    customerInfoEnabled: z.boolean(),
    lowStockThreshold: z.number().int().min(1).max(99),
  })
  .partial()
  .strict()

export const updateSettings = async ({ db, client, user, shopId, at = new Date() }, patch) => {
  const parsed = patchSchema.safeParse(patch)
  if (!parsed.success) throw new UserError(parsed.error.issues[0].message)
  if (!Object.keys(parsed.data).length) throw new UserError("Nothing to change")
  return withTransaction(client, async (session) => {
    const before = await db.collection(C.settings).findOne({ _id: shopId }, { session })
    if (!before) throw new UserError("This shop has no settings yet")
    const after = { ...before, ...parsed.data }
    await db.collection(C.settings).updateOne({ _id: shopId }, { $set: parsed.data }, { session })
    const changes = changesBetween(before, after, FIELDS)
    if (Object.keys(changes).length) await writeAudit(db, session, { shopId, userId: user.id, kind: "settings.update", target: shopId, changes, at })
    const { _id, shopId: _shop, ...settings } = after
    return settings
  })
}
