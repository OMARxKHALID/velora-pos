import { z } from "zod"
import { UserError } from "@/features/auth/server/session-errors"
import { applyCloseShift, applyOpenShift } from "@/features/demo/lib/ledger"
import { COLLECTIONS as C, fromDoc, toDoc } from "@/lib/db/collections"
import { isDuplicateKey, withTransaction } from "@/lib/db/transaction"
import { registerFor } from "./register"

const money = z.number().int({ error: "Whole amounts only" }).min(0, { error: "Cannot be negative" }).max(10_000_000_00, { error: "That looks too large" })

const openSchema = z.object({ openingCash: money, clientId: z.string().min(8).max(64), registerId: z.string().max(60).optional() })
const closeSchema = z.object({ shiftId: z.string().min(1).max(64), countedCash: money, note: z.string().trim().max(200).default("") })

const parse = (schema, value) => {
  const result = schema.safeParse(value)
  if (!result.success) throw new UserError(result.error.issues[0].message)
  return result.data
}

export const openShift = async ({ db, client, user, shopId, at = new Date() }, input) => {
  const { openingCash, clientId, registerId } = parse(openSchema, input)
  try {
    return await withTransaction(client, async (session) => {
      const existing = await db.collection(C.shifts).findOne({ clientId }, { session })
      if (existing) return fromDoc(existing)
      const register = await registerFor(db, session, shopId, registerId)
      const open = await db.collection(C.shifts).find({ registerId: register._id, status: "open" }, { session }).toArray()
      let record
      try {
        ;({ record } = applyOpenShift({ shifts: open.map(fromDoc) }, { cashierId: user.id, openingCash, at, clientId, shopId, registerId: register._id }))
      } catch (error) {
        throw new UserError(error.message)
      }
      const shift = { ...record, syncedAt: at }
      await db.collection(C.shifts).insertOne(toDoc(shift), { session })
      return shift
    })
  } catch (error) {
    if (!isDuplicateKey(error)) throw error
    const existing = await db.collection(C.shifts).findOne({ clientId })
    if (existing) return fromDoc(existing)
    throw new UserError("A shift is already open on this counter")
  }
}

export const closeShift = async ({ db, client, user, shopId, at = new Date() }, input) => {
  const { shiftId, countedCash, note } = parse(closeSchema, input)
  return withTransaction(client, async (session) => {
    const shift = await db.collection(C.shifts).findOne({ _id: shiftId, shopId }, { session })
    if (!shift || shift.status !== "open") throw new UserError("Shift is not open")
    const sales = await db.collection(C.sales).find({ shiftId }, { session }).toArray()
    const refunds = await db.collection(C.refunds).find({ $or: [{ payoutShiftId: shiftId }, { approvedInShiftId: shiftId }] }, { session }).toArray()
    let record
    try {
      ;({ record } = applyCloseShift({ shifts: [fromDoc(shift)], sales: sales.map(fromDoc), refunds: refunds.map(fromDoc) }, { shiftId, countedCash, closedBy: user.id, note, at }))
    } catch (error) {
      throw new UserError(error.message)
    }
    const closed = { ...record, syncedAt: at }
    await db.collection(C.shifts).replaceOne({ _id: shiftId, status: "open" }, toDoc(closed), { session })
    return closed
  })
}
