import { z } from "zod"
import { NTN_PATTERN, POSID_PATTERN } from "@/features/fbr/lib/fbr"
import { UserError, parseInput } from "@/shared/lib/errors"
import { changesBetween, writeAudit } from "@/server/db/audit"
import { COLLECTIONS as C } from "@/server/db/collections"
import { withTransaction } from "@/server/db/transaction"

const FIELDS = ["taxEnabled", "taxLabel", "taxRate", "productDiscountEnabled", "cartDiscountEnabled", "customerInfoEnabled", "lowStockThreshold", "paymentMethods", "posColumns", "cashRounding", "pricesIncludeTax", "fbrEnabled", "fbrServiceFee", "receipt"]

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
    posColumns: z.number().int().min(3).max(8),
    cashRounding: z.union([z.literal(1), z.literal(5), z.literal(10)]),
    pricesIncludeTax: z.boolean(),
    fbrEnabled: z.boolean(),
    fbrServiceFee: z.boolean(),
    receipt: z
      .object({
        title: z.string().trim().max(40),
        footer: z.string().trim().max(160),
        policy: z.string().trim().max(400),
        paper: z.enum(["58", "80"]),
        showCashier: z.boolean(),
        showCustomer: z.boolean(),
        showBarcode: z.boolean(),
      })
      .partial()
      .strict(),
  })
  .partial()
  .strict()

const requireFbrDetails = async (db, session, shopId) => {
  const shop = await db.collection(C.shops).findOne({ _id: shopId }, { session })
  const registers = await db.collection(C.registers).find({ shopId }, { session }).toArray()
  const missing = [
    ...(NTN_PATTERN.test(shop?.ntn ?? "") ? [] : ["the shop's NTN"]),
    ...registers.filter(({ fbrPosId }) => !POSID_PATTERN.test(fbrPosId ?? "")).map(({ code }) => `${code}'s POSID`),
  ]
  if (missing.length) throw new UserError(`Fill in ${missing.join(", ")} in the Shops tab before turning on FBR reporting`)
}

export const updateSettings = async ({ db, client, user, shopId, at = new Date() }, patch) => {
  const updates = parseInput(patchSchema, patch)
  if (!Object.keys(updates).length) throw new UserError("Nothing to change")
  return withTransaction(client, async (session) => {
    const before = await db.collection(C.settings).findOne({ _id: shopId }, { session })
    if (!before) throw new UserError("This shop has no settings yet")
    if (updates.fbrEnabled) await requireFbrDetails(db, session, shopId)
    const after = { ...before, ...updates, ...(updates.receipt && { receipt: { ...before.receipt, ...updates.receipt } }) }
    await db.collection(C.settings).updateOne({ _id: shopId }, { $set: { ...updates, ...(updates.receipt && { receipt: after.receipt }) } }, { session })
    const changes = changesBetween(before, after, FIELDS)
    if (Object.keys(changes).length) await writeAudit(db, session, { shopId, userId: user.id, kind: "settings.update", target: shopId, changes, at })
    const { _id, shopId: _shop, ...settings } = after
    return settings
  })
}
