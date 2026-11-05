import "server-only"
import { z } from "zod"
import { UserError, parseInput, userFacing } from "@/shared/lib/errors"
import { PAYMENT_METHODS, applyRefundDecision, applyRefundRequest } from "@/features/ledger/lib/rules"
import { fbrSeqOf, registerFor, saveFbrSeq, shopSettings } from "@/features/pos/server/register"
import { moveStock } from "@/features/inventory/server/stock"
import { COLLECTIONS as C, fromDoc, toDoc } from "@/server/db/collections"
import { findByClientId, findDocs, lockSale, lockShift, replayOnDuplicate, withTransaction } from "@/server/db/transaction"

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

export const requestRefund = async ({ db, client, user, shopId, at = new Date() }, input) => {
  const request = parseInput(requestSchema, input)
  return replayOnDuplicate(
    () =>
      withTransaction(client, async (session) => {
        const existing = await findByClientId(db, session, C.refunds, request.clientId)
        if (existing) return existing
        const sale = await db.collection(C.sales).findOne({ _id: request.saleId, shopId }, { session })
        if (!sale) throw new UserError("Sale not found")
        if (user.role === "cashier" && sale.cashierId !== user.id) throw new UserError("You can only return your own sales. Ask a supervisor.")
        await lockSale(db, session, sale._id)
        const openShift = await db.collection(C.shifts).findOne({ registerId: sale.registerId, status: "open" }, { session })
        const { returnWindowDays } = await shopSettings(db, session, shopId)
        const refunds = await findDocs(db, session, C.refunds, { saleId: sale._id })
        const exchanges = await findDocs(db, session, C.exchanges, { saleId: sale._id })
        const { record } = userFacing(() =>
          applyRefundRequest({ sales: [fromDoc(sale)], refunds, exchanges }, { ...request, requestedBy: user.id, shiftId: openShift?._id ?? sale.shiftId, at, returnWindowDays })
        )
        const refund = { ...record, syncedAt: at }
        await db.collection(C.refunds).insertOne(toDoc(refund), { session })
        return refund
      }),
    () => findByClientId(db, undefined, C.refunds, request.clientId)
  )
}

export const decideRefund = async ({ db, client, user, shopId, at = new Date() }, { refundId, approve }) => {
  if (typeof refundId !== "string" || !refundId) throw new UserError("Return not found")
  return withTransaction(client, async (session) => {
    const refund = await db.collection(C.refunds).findOne({ _id: refundId, shopId }, { session })
    if (!refund) throw new UserError("Return not found")
    const sale = await db.collection(C.sales).findOne({ _id: refund.saleId, shopId }, { session })
    if (!sale) throw new UserError("The sale for this return was not found")
    const openShift = await db.collection(C.shifts).findOne({ registerId: sale.registerId, status: "open" }, { session })
    const register = await registerFor(db, session, shopId, sale.registerId)
    if (approve && openShift) await lockShift(db, session, openShift._id)
    const exchanges = await findDocs(db, session, C.exchanges, { saleId: sale._id })
    const { record: decided, state } = userFacing(() =>
      applyRefundDecision(
        { refunds: [fromDoc(refund)], sales: [fromDoc(sale)], exchanges, shifts: openShift ? [fromDoc(openShift)] : [], variants: [], products: [], stock: {}, movements: [], fbrSeq: fbrSeqOf(register) },
        { refundId, approve: Boolean(approve), userId: user.id, at }
      )
    )
    if (decided.fbr) await saveFbrSeq(db, session, register._id, state.fbrSeq)
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
