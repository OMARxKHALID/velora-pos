import { z } from "zod"
import { UserError, parseInput } from "@/lib/errors"
import { PAYMENT_METHODS, applyRefundDecision, applyRefundRequest } from "@/features/ledger/lib/rules"
import { fbrSeqOf, registerFor, saveFbrSeq } from "@/features/pos/server/register"
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
  method: z.enum(PAYMENT_METHODS),
})

const refundsOf = async (db, session, saleId) => (await db.collection(C.refunds).find({ saleId }, { session }).toArray()).map(fromDoc)

const lockSale = (db, session, saleId) => db.collection(C.sales).updateOne({ _id: saleId }, { $inc: { claimSeq: 1 } }, { session })

const exchangesOf = async (db, session, saleId) => (await db.collection(C.exchanges).find({ saleId }, { session }).toArray()).map(fromDoc)

export const requestRefund = async ({ db, client, user, shopId, at = new Date() }, input) => {
  const request = parseInput(requestSchema, input)
  try {
    return await withTransaction(client, async (session) => {
      const existing = await db.collection(C.refunds).findOne({ clientId: request.clientId }, { session })
      if (existing) return fromDoc(existing)
      const sale = await db.collection(C.sales).findOne({ _id: request.saleId, shopId }, { session })
      if (!sale) throw new UserError("Sale not found")
      if (user.role === "cashier" && sale.cashierId !== user.id) throw new UserError("You can only return your own sales. Ask a supervisor.")
      await lockSale(db, session, sale._id)
      const openShift = await db.collection(C.shifts).findOne({ registerId: sale.registerId, status: "open" }, { session })
      let record
      try {
        ;({ record } = applyRefundRequest(
          { sales: [fromDoc(sale)], refunds: await refundsOf(db, session, sale._id), exchanges: await exchangesOf(db, session, sale._id) },
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
  if (typeof refundId !== "string" || !refundId) throw new UserError("Return not found")
  return withTransaction(client, async (session) => {
    const refund = await db.collection(C.refunds).findOne({ _id: refundId, shopId }, { session })
    if (!refund) throw new UserError("Return not found")
    const sale = await db.collection(C.sales).findOne({ _id: refund.saleId }, { session })
    const openShift = await db.collection(C.shifts).findOne({ registerId: sale.registerId, status: "open" }, { session })
    const register = await registerFor(db, session, shopId, sale.registerId)
    if (approve && openShift) await db.collection(C.shifts).updateOne({ _id: openShift._id }, { $inc: { writeSeq: 1 } }, { session })
    let decided
    let fbrSeq
    try {
      const result = applyRefundDecision(
        {
          refunds: [fromDoc(refund)],
          sales: [fromDoc(sale)],
          exchanges: await exchangesOf(db, session, sale._id),
          shifts: openShift ? [fromDoc(openShift)] : [],
          variants: [],
          products: [],
          stock: {},
          movements: [],
          fbrSeq: fbrSeqOf(register),
        },
        { refundId, approve: Boolean(approve), userId: user.id, at }
      )
      decided = result.record
      fbrSeq = result.state.fbrSeq
    } catch (error) {
      throw new UserError(error.message)
    }
    if (decided.fbr) await saveFbrSeq(db, session, register._id, fbrSeq)
    const updated = await db.collection(C.refunds).replaceOne({ _id: refundId, status: "pending" }, toDoc({ ...decided, syncedAt: at }), { session })
    if (!updated.matchedCount) throw new UserError("This return was already decided")
    if (approve) {
      for (const item of refund.items.filter(({ restock }) => restock)) {
        const unitCost = sale.items.find(({ variantId }) => variantId === item.variantId)?.unitCost ?? 0
        await moveStock(db, session, { shopId, variantId: item.variantId, quantity: item.quantity, type: "return", unitCost, ref: { kind: "Refund", id: refundId, number: refund.saleNumber }, userId: user.id, at })
      }
    }
    return { ...decided, syncedAt: at }
  })
}
