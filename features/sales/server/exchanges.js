import { z } from "zod"
import { applyExchange } from "@/features/ledger/lib/rules"
import { moveStock } from "@/features/inventory/server/stock"
import { fbrSeqOf, registerFor, saveFbrSeq } from "@/features/pos/server/register"
import { COLLECTIONS as C, fromDoc, toDoc } from "@/lib/db/collections"
import { isDuplicateKey, withTransaction } from "@/lib/db/transaction"
import { UserError, parseInput } from "@/lib/errors"

const requestSchema = z.object({
  clientId: z.string().min(8).max(64),
  saleId: z.string().min(1).max(64),
  fromVariantId: z.string().min(1).max(80),
  toVariantId: z.string().min(1).max(80),
  quantity: z.number().int({ error: "Quantity must be a whole number" }).min(1, { error: "Quantity must be at least 1" }).max(99),
})

const docsOf = async (db, session, collection, filter) => (await db.collection(collection).find(filter, { session }).toArray()).map(fromDoc)

const exchangeInSession = async (db, session, { user, shopId, at }, request) => {
  const existing = await db.collection(C.exchanges).findOne({ clientId: request.clientId }, { session })
  if (existing) return fromDoc(existing)

  const sale = await db.collection(C.sales).findOne({ _id: request.saleId, shopId }, { session })
  if (!sale) throw new UserError("Sale not found")
  if (user.role === "cashier" && sale.cashierId !== user.id) throw new UserError("You can only swap your own sales. Ask a supervisor.")

  const variants = await docsOf(db, session, C.variants, { _id: { $in: [request.fromVariantId, request.toVariantId] }, shopId })
  const products = await docsOf(db, session, C.products, { _id: { $in: [...new Set(variants.map(({ productId }) => productId))] }, shopId })
  const stock = await db.collection(C.stock).findOne({ shopId, variantId: request.toVariantId }, { session })
  const register = await registerFor(db, session, shopId, sale.registerId)

  let result
  try {
    result = applyExchange(
      {
        sales: [fromDoc(sale)],
        refunds: await docsOf(db, session, C.refunds, { saleId: sale._id }),
        exchanges: await docsOf(db, session, C.exchanges, { saleId: sale._id }),
        variants,
        products,
        stock: { [request.toVariantId]: stock?.quantity ?? 0 },
        movements: [],
        fbrSeq: fbrSeqOf(register),
      },
      { ...request, userId: user.id, at }
    )
  } catch (error) {
    throw new UserError(error.message)
  }

  const exchange = { ...result.record, syncedAt: at }
  await db.collection(C.exchanges).insertOne(toDoc(exchange), { session })
  const ref = { kind: "Exchange", id: exchange.id, number: sale.number }
  const soldAt = fromDoc(sale).items.find(({ variantId }) => variantId === request.fromVariantId).unitCost
  const toCost = variants.find(({ id }) => id === request.toVariantId).cost
  await moveStock(db, session, { shopId, variantId: request.fromVariantId, quantity: request.quantity, type: "exchange", unitCost: soldAt, ref, userId: user.id, at })
  await moveStock(db, session, { shopId, variantId: request.toVariantId, quantity: -request.quantity, type: "exchange", unitCost: toCost, ref, userId: user.id, at })
  if (exchange.fbr) await saveFbrSeq(db, session, register._id, result.state.fbrSeq)
  return exchange
}

export const exchangeItem = async ({ db, client, user, shopId, at = new Date() }, input) => {
  const request = parseInput(requestSchema, input)
  try {
    return await withTransaction(client, (session) => exchangeInSession(db, session, { user, shopId, at }, request))
  } catch (error) {
    if (!isDuplicateKey(error)) throw error
    const existing = await db.collection(C.exchanges).findOne({ clientId: request.clientId })
    if (existing) return fromDoc(existing)
    throw error
  }
}
