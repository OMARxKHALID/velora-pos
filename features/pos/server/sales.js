import { z } from "zod"
import { readApproval } from "@/features/auth/server/approval-token"
import { UserError } from "@/features/auth/server/session-errors"
import { MAX_CASHIER_DISCOUNT, PAYMENT_METHODS, applySale } from "@/features/demo/lib/ledger"
import { moveStock } from "@/features/inventory/server/stock"
import { cartTotals } from "@/features/pricing/lib/pricing"
import { COLLECTIONS as C, fromDoc, toDoc } from "@/lib/db/collections"
import { isDuplicateKey, withTransaction } from "@/lib/db/transaction"
import { registerFor, shopSettings } from "./register"

const saleSchema = z.object({
  clientId: z.string().min(8).max(64),
  shiftId: z.string().min(1).max(64),
  lines: z
    .array(
      z.object({
        variantId: z.string().min(1).max(80),
        quantity: z.number().int({ error: "Quantity must be a whole number" }).min(1, { error: "Quantity must be at least 1" }).max(99),
        entry: z.enum(["scan", "manual"]).default("scan"),
      })
    )
    .min(1, { error: "Cart is empty" })
    .max(100, { error: "Split carts over 100 lines" }),
  discountPct: z.number().int().min(0).max(90).default(0),
  approvalToken: z.string().max(1000).nullish(),
  payments: z
    .array(z.object({ method: z.enum(PAYMENT_METHODS), amount: z.number().int().positive(), reference: z.string().trim().max(30).optional() }))
    .min(1, { error: "Add a payment" })
    .max(4),
  customerName: z.string().trim().max(60).optional(),
  customerPhone: z.string().trim().max(30).optional(),
})

const parse = (schema, value) => {
  const result = schema.safeParse(value)
  if (!result.success) throw new UserError(result.error.issues[0].message)
  return result.data
}

const approverFor = async (db, session, { approvalSecret, cashierId, discountPct, token, at }) => {
  if (!token) return null
  const approval = readApproval(approvalSecret, token, { cashierId, discountPct, now: at.getTime() })
  if (!approval) throw new UserError("The supervisor approval has expired or does not match this discount. Ask for it again.")
  const supervisor = await db.collection(C.users).findOne({ _id: approval.supervisorId }, { session, projection: { role: 1, banned: 1, removedAt: 1 } })
  if (!supervisor || supervisor.role !== "manager" || supervisor.banned || supervisor.removedAt) throw new UserError("The approving supervisor is no longer active. Ask another supervisor.")
  return approval.supervisorId
}

const merge = (lines) => Object.values(lines.reduce((all, line) => ({ ...all, [line.variantId]: all[line.variantId] ? { ...all[line.variantId], quantity: all[line.variantId].quantity + line.quantity } : line }), {}))

const recordInSession = async (db, session, { user, shopId, at, approvalSecret }, input) => {
  const existing = await db.collection(C.sales).findOne({ clientId: input.clientId }, { session })
  if (existing) return fromDoc(existing)

  const shift = await db.collection(C.shifts).findOne({ _id: input.shiftId, shopId }, { session })
  if (!shift) throw new UserError("Open a shift before selling")
  const register = await registerFor(db, session, shopId, shift.registerId)
  const settings = await shopSettings(db, session, shopId)

  const lines = merge(input.lines)
  const variants = await db.collection(C.variants).find({ _id: { $in: lines.map(({ variantId }) => variantId) }, shopId }, { session }).toArray()
  if (variants.length !== lines.length) throw new UserError("Unknown item")
  const products = await db.collection(C.products).find({ _id: { $in: [...new Set(variants.map(({ productId }) => productId))] }, shopId }, { session }).toArray()
  const catalog = { products: products.map(fromDoc), variants: variants.map(fromDoc) }
  const index = { productById: Object.fromEntries(catalog.products.map((product) => [product.id, product])), variantById: Object.fromEntries(catalog.variants.map((variant) => [variant.id, variant])) }

  const { rows, subtotal } = cartTotals(lines, input.discountPct, index, settings)
  const cartDiscount = rows.reduce((sum, { discount }) => sum + discount, 0)
  const needsApproval = cartDiscount > subtotal * MAX_CASHIER_DISCOUNT
  const approvedBy = needsApproval ? await approverFor(db, session, { approvalSecret, cashierId: user.id, discountPct: input.discountPct, token: input.approvalToken, at }) : null

  let sale
  try {
    ;({ record: sale } = applySale(
      { ...catalog, sales: [], stock: {}, movements: [], outbox: [], shifts: [fromDoc(shift)], receiptSeq: register.lastReceiptSeq },
      {
        lines: rows.map(({ variantId, quantity, discount, productDiscount, entry }) => ({ variantId, quantity, discount, productDiscount, entry })),
        payments: input.payments,
        cashierId: user.id,
        shiftId: shift._id,
        at,
        clientId: input.clientId,
        approvedBy,
        settings,
        customerName: settings.customerInfoEnabled ? input.customerName : undefined,
        customerPhone: settings.customerInfoEnabled ? input.customerPhone : undefined,
        shopId,
        registerId: register._id,
        registerCode: register.code,
      }
    ))
  } catch (error) {
    throw new UserError(error.message)
  }

  const seq = (await db.collection(C.registers).findOneAndUpdate({ _id: register._id }, { $inc: { lastReceiptSeq: 1 } }, { returnDocument: "after", session })).lastReceiptSeq
  const number = `${register.code}-${String(seq).padStart(6, "0")}`

  for (const item of sale.items) {
    try {
      await moveStock(db, session, {
        shopId,
        variantId: item.variantId,
        quantity: -item.quantity,
        type: "sale",
        unitCost: item.unitCost,
        ref: { kind: "Sale", id: sale.id, number },
        userId: user.id,
        at,
      })
    } catch (error) {
      if (error.message !== "Not enough stock") throw error
      const left = (await db.collection(C.stock).findOne({ shopId, variantId: item.variantId }, { session }))?.quantity ?? 0
      throw new UserError(`Only ${Math.max(left, 0)} left of ${item.productName} (${item.attributes.color} · EU ${item.attributes.size})`)
    }
  }

  const stored = { ...sale, number, flags: sale.flags.filter((flag) => flag !== "negative_stock"), syncedAt: at, offline: false }
  await db.collection(C.sales).insertOne(toDoc(stored), { session })
  return stored
}

export const recordSale = async ({ db, client, user, shopId, approvalSecret, at = new Date() }, input) => {
  const request = parse(saleSchema, input)
  try {
    return await withTransaction(client, (session) => recordInSession(db, session, { user, shopId, at, approvalSecret }, request))
  } catch (error) {
    if (!isDuplicateKey(error)) throw error
    const existing = await db.collection(C.sales).findOne({ clientId: request.clientId })
    if (existing) return fromDoc(existing)
    throw error
  }
}
