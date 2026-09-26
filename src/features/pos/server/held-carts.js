import { z } from "zod"
import { UserError, parseInput } from "@/shared/lib/errors"
import { COLLECTIONS as C, fromDoc } from "@/server/db/collections"
import { newId } from "@/shared/lib/id"
import { registerFor } from "./register"

const MAX_HELD = 20

const holdSchema = z.object({
  label: z.string().trim().max(40).default(""),
  registerId: z.string().max(60).optional(),
  cart: z.object({
    lines: z
      .array(z.object({ variantId: z.string().min(1).max(80), quantity: z.number().int().min(1).max(99), entry: z.enum(["scan", "manual"]).default("scan") }))
      .min(1, { error: "The cart is empty" })
      .max(100),
    discountPct: z.number().int().min(0).max(90).default(0),
    approvedBy: z.string().max(64).nullish(),
    approvalToken: z.string().max(1000).nullish(),
    customerName: z.string().trim().max(60).default(""),
    customerPhone: z.string().trim().max(30).default(""),
  }),
})

export const holdCart = async ({ db, user, shopId, at = new Date() }, input) => {
  const { cart, label, registerId } = parseInput(holdSchema, input)
  const register = await registerFor(db, undefined, shopId, registerId)
  const known = await db.collection(C.variants).countDocuments({ _id: { $in: cart.lines.map(({ variantId }) => variantId) }, shopId })
  if (known !== new Set(cart.lines.map(({ variantId }) => variantId)).size) throw new UserError("Unknown item")
  const count = await db.collection(C.heldCarts).countDocuments({ registerId: register._id })
  if (count >= MAX_HELD) throw new UserError(`At most ${MAX_HELD} sales can be on hold. Resume or discard one first.`)
  const held = {
    _id: newId(),
    shopId,
    registerId: register._id,
    ...cart,
    approvedBy: cart.approvedBy ?? null,
    approvalToken: cart.approvalToken ?? null,
    label: label || cart.customerName || `Order #${count + 1}`,
    parkedBy: user.id,
    parkedAt: at,
  }
  await db.collection(C.heldCarts).insertOne(held)
  return fromDoc(held)
}

export const takeHeldCart = async ({ db, shopId }, id) => {
  const taken = await db.collection(C.heldCarts).findOneAndDelete({ _id: String(id), shopId })
  if (!taken) throw new UserError("This sale was already resumed or discarded on another screen")
  return fromDoc(taken)
}

export const discardHeldCart = async ({ db, shopId }, id) => {
  await db.collection(C.heldCarts).deleteOne({ _id: String(id), shopId })
  return {}
}
