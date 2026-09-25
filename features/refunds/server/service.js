import { z } from "zod"
import { UserError, parseInput } from "@/lib/errors"
import { applyRefundDecision, applyRefundRequest } from "@/features/ledger/lib/rules"
import { moveStock } from "@/features/inventory/server/stock"
import { COLLECTIONS as C, fromDoc, toDoc } from "@/lib/db/collections"
import { isDuplicateKey, withTransaction } from "@/lib/db/transaction"

const requestSchema = z.object({
  clientId: z.string().min(8).max(64),
  saleId: z.string().min(1).max(64),
  lines: z
    .array(z.object({ variantId: z.string().min(1).max(80), quantity: z.number().int().min(1).max(99), restock: z.boolean().default(true) }))
    .min(1, { error: "Pick at least one item" })
    .max(100),
  reason: z.string().trim().min(3, { error: "Describe the reason" }).max(240),
  method: z.enum(["cash", "card"]),
})

const refundsOf = async (db, session, saleId) => (await db.collection(C.refunds).find({ saleId }, { session }).toArray()).map(fromDoc)

export const requestRefund = async ({ db, client, user, shopId, at = new Date() }, input) => {
  const request = parseInput(requestSchema, input)
  try {
    return await withTransaction(client, async (session) => {
      const existing = await db.collection(C.refunds).findOne({ clientId: request.clientId }, { session })
      if (existing) return fromDoc(existing)
      const sale = await db.collection(C.sales).findOne({ _id: request.saleId, shopId }, { session })
      if (!sale) throw new UserError("Sale not found")
      if (user.role === "cashier" && sale.cashierId !== user.id) throw new UserError("You can only return your own sales. Ask a supervisor.")
      const openShift = await db.collection(C.shifts).findOne({ registerId: sale.registerId, status: "open" }, { session })
      let record
      try {
        ;({ record } = applyRefundRequest(
          { sales: [fromDoc(sale)], refunds: await refundsOf(db, session, sale._id) },
          { ...request, requestedBy: user.id, shiftId: openShift?._id ?? sale.shiftId, at }
        ))
      } catch (error) {
        throw new UserError(error.message)
      }
      const refund = { ...record, syncedAt: at }
      await db.collection(C.refunds).insertOne(toDoc(refund), { session })
      return refund
    })
  } catch (error) {
    if (!isDuplicateKey(error)) throw error
    const existing = await db.collection(C.refunds).findOne({ clientId: request.clientId })
    if (existing) return fromDoc(existing)
    throw error
  }
}

export const decideRefund = async ({ db, client, user, shopId, at = new Date() }, { refundId, approve }) => {
  if (typeof refundId !== "string" || !refundId) throw new UserError("Refund not found")
  return withTransaction(client, async (session) => {
    const refund = await db.collection(C.refunds).findOne({ _id: refundId, shopId }, { session })
    if (!refund) throw new UserError("Refund not found")
    const sale = await db.collection(C.sales).findOne({ _id: refund.saleId }, { session })
    const openShift = await db.collection(C.shifts).findOne({ registerId: sale.registerId, status: "open" }, { session })
    let decided
    try {
      ;({ record: decided } = applyRefundDecision(
        { refunds: [fromDoc(refund)], sales: [fromDoc(sale)], shifts: openShift ? [fromDoc(openShift)] : [], variants: [], products: [], stock: {}, movements: [] },
        { refundId, approve: Boolean(approve), userId: user.id, at }
      ))
    } catch (error) {
      throw new UserError(error.message)
    }
    const updated = await db.collection(C.refunds).replaceOne({ _id: refundId, status: "pending" }, toDoc({ ...decided, syncedAt: at }), { session })
    if (!updated.matchedCount) throw new UserError("Refund already decided")
    if (approve) {
      for (const item of refund.items.filter(({ restock }) => restock)) {
        const unitCost = sale.items.find(({ variantId }) => variantId === item.variantId)?.unitCost ?? 0
        await moveStock(db, session, { shopId, variantId: item.variantId, quantity: item.quantity, type: "return", unitCost, ref: { kind: "Refund", id: refundId, number: refund.saleNumber }, userId: user.id, at })
      }
    }
    return { ...decided, syncedAt: at }
  })
}
