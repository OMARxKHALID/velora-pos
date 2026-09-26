import { z } from "zod"
import { DRAWER_REASONS, applyDrawerOpen } from "@/features/ledger/lib/rules"
import { COLLECTIONS as C, toDoc } from "@/server/db/collections"
import { UserError, parseInput } from "@/shared/lib/errors"
import { registerFor } from "./register"

const drawerSchema = z.object({
  registerId: z.string().min(1).max(64),
  shiftId: z.string().min(1).max(64).nullish(),
  reason: z.enum(Object.keys(DRAWER_REASONS), { error: "Unknown drawer reason" }),
  note: z.string().trim().max(120).default(""),
})

export const openDrawer = async ({ db, user, shopId, at = new Date() }, input) => {
  const request = parseInput(drawerSchema, input)
  const register = await registerFor(db, undefined, shopId, request.registerId)
  if (request.shiftId) {
    const shift = await db.collection(C.shifts).findOne({ _id: request.shiftId, shopId, registerId: register._id, status: "open" })
    if (!shift) throw new UserError("That shift is not open on this counter")
  }
  let record
  try {
    ;({ record } = applyDrawerOpen(
      { registers: [{ id: register._id, manualDrawer: register.manualDrawer !== false }], drawerEvents: [] },
      { registerId: register._id, shiftId: request.shiftId ?? null, userId: user.id, reason: request.reason, note: request.note, at }
    ))
  } catch (error) {
    throw new UserError(error.message)
  }
  await db.collection(C.drawerEvents).insertOne(toDoc({ ...record, shopId }))
  return record
}
