import { z } from "zod"
import { NTN_PATTERN, POSID_PATTERN } from "@/features/fbr/lib/fbr"
import { CASHIER_DISCOUNT_LIMITS, RETURN_WINDOWS } from "@/features/ledger/lib/rules"
import { RECEIPT_TEXT_SIZES, RECEIPT_TITLE_STYLES } from "@/features/pos/lib/receipt-design"
import { CASH_NOTE_CHOICES, DISCOUNT_STEP_CHOICES, MAX_RETURN_REASONS, PHONE_REQUIRED_CHOICES } from "@/features/pricing/lib/pricing"
import { UserError, parseInput } from "@/shared/lib/errors"
import { changesBetween, writeAudit } from "@/server/db/audit"
import { COLLECTIONS as C } from "@/server/db/collections"
import { withTransaction } from "@/server/db/transaction"

const FIELDS = ["taxEnabled", "taxLabel", "taxRate", "productDiscountEnabled", "cartDiscountEnabled", "customerInfoEnabled", "lowStockThreshold", "paymentMethods", "posColumns", "cashRounding", "pricesIncludeTax", "fbrEnabled", "fbrServiceFee", "returnWindowDays", "cashierDiscountPct", "discountSteps", "restockReturns", "returnReasons", "cashNoteAbove", "scanBeep", "phoneRequiredAbove", "receipt"]

const oneOf = (values) => z.union(values.map((value) => z.literal(value)))

const distinct = (list) => new Set(list.map((item) => String(item).toLowerCase())).size === list.length

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
    returnWindowDays: oneOf(RETURN_WINDOWS),
    cashierDiscountPct: oneOf(CASHIER_DISCOUNT_LIMITS),
    discountSteps: z.array(oneOf(DISCOUNT_STEP_CHOICES)).min(1, { error: "Keep at least one discount button" }).max(6, { error: "At most six discount buttons fit" }).refine(distinct),
    restockReturns: z.boolean(),
    returnReasons: z.array(z.string().trim().min(2, { error: "Each reason needs a few letters" }).max(40)).max(MAX_RETURN_REASONS, { error: `At most ${MAX_RETURN_REASONS} reasons` }).refine(distinct, { error: "Each reason must be different" }),
    cashNoteAbove: oneOf(CASH_NOTE_CHOICES),
    scanBeep: z.boolean(),
    phoneRequiredAbove: oneOf(PHONE_REQUIRED_CHOICES),
    receipt: z
      .object({
        title: z.string().trim().max(40),
        tagline: z.string().trim().max(60),
        headerNote: z.string().trim().max(120),
        footer: z.string().trim().max(160),
        policy: z.string().trim().max(400),
        paper: z.enum(["58", "80"]),
        textSize: z.enum(RECEIPT_TEXT_SIZES),
        titleStyle: z.enum(RECEIPT_TITLE_STYLES),
        showShopName: z.boolean(),
        showAddress: z.boolean(),
        showPhone: z.boolean(),
        showCashier: z.boolean(),
        showCustomer: z.boolean(),
        showColorSize: z.boolean(),
        showLineDiscounts: z.boolean(),
        showReturnDeadline: z.boolean(),
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
