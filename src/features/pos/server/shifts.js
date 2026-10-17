import { z } from "zod"
import { UserError, parseInput } from "@/shared/lib/errors"
import { applyCloseShift, applyOpenShift } from "@/features/ledger/lib/rules"
import { COLLECTIONS as C, fromDoc, toDoc } from "@/server/db/collections"
import { isDuplicateKey, withTransaction } from "@/server/db/transaction"
import { MAX_BLOCKS } from "../lib/receipts"
import { registerFor, reserveOfflineBlock, shopSettings } from "./register"

const money = z.number().int({ error: "Whole amounts only" }).min(0, { error: "Cannot be negative" }).max(10_000_000_00, { error: "That looks too large" })

const openSchema = z.object({ openingCash: money, clientId: z.string().min(8).max(64), registerId: z.string().max(60).optional() })
const reserveSchema = z.object({ shiftId: z.string().min(1).max(64) })
const closeSchema = z.object({ shiftId: z.string().min(1).max(64), countedCash: money, note: z.string().trim().max(200).default("") })

export const openShift = async ({ db, client, user, shopId, at = new Date() }, input) => {
  const { openingCash, clientId, registerId } = parseInput(openSchema, input)
  try {
    return await withTransaction(client, async (session) => {
      const existing = await db.collection(C.shifts).findOne({ clientId }, { session })
      if (existing) return fromDoc(existing)
      const register = await registerFor(db, session, shopId, registerId)
      const open = await db.collection(C.shifts).find({ registerId: register._id, status: "open" }, { session }).toArray()
      let record
      try {
        ;({ record } = applyOpenShift({ shifts: open.map(fromDoc) }, { cashierId: user.id, openingCash, at, clientId, shopId, registerId: register._id, registerCode: register.code }))
      } catch (error) {
        throw new UserError(error.message)
      }
      const block = await reserveOfflineBlock(db, session, register._id)
      const shift = { ...record, receiptBlocks: [block], syncedAt: at }
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

const shiftLedger = async (db, session, shift) => ({
  shifts: [fromDoc(shift)],
  sales: (await db.collection(C.sales).find({ shiftId: shift._id }, { session }).toArray()).map(fromDoc),
  refunds: (await db.collection(C.refunds).find({ $or: [{ payoutShiftId: shift._id }, { approvedInShiftId: shift._id }] }, { session }).toArray()).map(fromDoc),
  drawerEvents: (await db.collection(C.drawerEvents).find({ shiftId: shift._id }, { session }).toArray()).map(fromDoc),
})

export const recountClosedShift = async (db, session, shiftId) => {
  const shift = await db.collection(C.shifts).findOne({ _id: shiftId, status: "closed" }, { session })
  if (!shift) return null
  const { record } = applyCloseShift(
    await shiftLedger(db, session, { ...shift, status: "open" }),
    { shiftId, countedCash: shift.countedCash, closedBy: shift.closedBy, note: shift.closeNote, at: shift.closedAt }
  )
  const { summary, expectedCash, difference } = record
  await db.collection(C.shifts).updateOne({ _id: shiftId }, { $set: { summary, expectedCash, difference } }, { session })
  return { ...fromDoc(shift), summary, expectedCash, difference }
}

export const closeShift = async ({ db, client, user, shopId, at = new Date() }, input) => {
  const { shiftId, countedCash, note } = parseInput(closeSchema, input)
  return withTransaction(client, async (session) => {
    const shift = await db.collection(C.shifts).findOne({ _id: shiftId, shopId }, { session })
    if (!shift || shift.status !== "open") throw new UserError("Shift is not open")
    const { cashNoteAbove } = await shopSettings(db, session, shopId)
    let record
    try {
      ;({ record } = applyCloseShift(await shiftLedger(db, session, shift), { shiftId, countedCash, closedBy: user.id, note, noteAbove: cashNoteAbove ?? null, at }))
    } catch (error) {
      throw new UserError(error.message)
    }
    const closed = { ...record, syncedAt: at }
    await db.collection(C.shifts).replaceOne({ _id: shiftId, status: "open" }, toDoc(closed), { session })
    return closed
  })
}

export const reserveReceipts = async ({ db, client, user, shopId }, input) => {
  const { shiftId } = parseInput(reserveSchema, input)
  return withTransaction(client, async (session) => {
    const shift = await db.collection(C.shifts).findOne({ _id: shiftId, shopId }, { session })
    if (!shift || shift.status !== "open") throw new UserError("Shift is not open")
    if (shift.cashierId !== user.id) throw new UserError("This shift belongs to another cashier")
    const blocks = shift.receiptBlocks ?? []
    if (blocks.length >= MAX_BLOCKS) throw new UserError("This shift has used all its offline receipt numbers. Close it and open a new one.")
    const register = await registerFor(db, session, shopId, shift.registerId)
    const block = await reserveOfflineBlock(db, session, register._id)
    const updated = await db
      .collection(C.shifts)
      .findOneAndUpdate({ _id: shiftId, status: "open" }, { $push: { receiptBlocks: block }, $set: { registerCode: register.code } }, { returnDocument: "after", session })
    return fromDoc(updated)
  })
}
