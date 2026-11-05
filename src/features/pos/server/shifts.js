import "server-only"
import { z } from "zod"
import { UserError, parseInput, userFacing } from "@/shared/lib/errors"
import { applyCloseShift, applyOpenShift } from "@/features/ledger/lib/rules"
import { COLLECTIONS as C, fromDoc, toDoc } from "@/server/db/collections"
import { findByClientId, findDocs, isDuplicateKey, replayOnDuplicate, withTransaction } from "@/server/db/transaction"
import { MAX_BLOCKS } from "../lib/receipts"
import { registerFor, reserveOfflineBlock, shopSettings } from "./register"

const money = z.number().int({ error: "Whole amounts only" }).min(0, { error: "Cannot be negative" }).max(10_000_000_00, { error: "That looks too large" })

const openSchema = z.object({ openingCash: money, clientId: z.string().min(8).max(64), registerId: z.string().max(60).optional() })
const reserveSchema = z.object({ shiftId: z.string().min(1).max(64) })
const closeSchema = z.object({ shiftId: z.string().min(1).max(64), countedCash: money, note: z.string().trim().max(200).default("") })

export const openShift = async ({ db, client, user, shopId, at = new Date() }, input) => {
  const { openingCash, clientId, registerId } = parseInput(openSchema, input)
  const work = () =>
    withTransaction(client, async (session) => {
      const existing = await findByClientId(db, session, C.shifts, clientId)
      if (existing) return existing
      const register = await registerFor(db, session, shopId, registerId)
      const open = await findDocs(db, session, C.shifts, { registerId: register._id, status: "open" })
      const { record } = userFacing(() => applyOpenShift({ shifts: open }, { cashierId: user.id, openingCash, at, clientId, shopId, registerId: register._id, registerCode: register.code }))
      const block = await reserveOfflineBlock(db, session, register._id)
      const shift = { ...record, receiptBlocks: [block], syncedAt: at }
      await db.collection(C.shifts).insertOne(toDoc(shift), { session })
      return shift
    })
  try {
    return await replayOnDuplicate(work, () => findByClientId(db, undefined, C.shifts, clientId))
  } catch (error) {
    if (isDuplicateKey(error)) throw new UserError("A shift is already open on this counter")
    throw error
  }
}

const shiftLedger = async (db, session, shift) => ({
  shifts: [fromDoc(shift)],
  sales: await findDocs(db, session, C.sales, { shiftId: shift._id }),
  refunds: await findDocs(db, session, C.refunds, { $or: [{ payoutShiftId: shift._id }, { approvedInShiftId: shift._id }] }),
  drawerEvents: await findDocs(db, session, C.drawerEvents, { shiftId: shift._id }),
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
    const ledger = await shiftLedger(db, session, shift)
    const { record } = userFacing(() => applyCloseShift(ledger, { shiftId, countedCash, closedBy: user.id, note, noteAbove: cashNoteAbove ?? null, at }))
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
