import { z } from "zod"

export const removeReasons = { damaged: "Damaged", lost: "Lost / stolen", expired: "Unsellable", count: "Stock count" }
export const addReasons = { found: "Found", count: "Stock count" }

export const purchaseSchema = z.object({
  supplier: z.string().trim().min(2, { error: "Enter the supplier name" }),
  lines: z
    .array(z.object({ variantId: z.string(), quantity: z.coerce.number().int({ error: "Whole pairs only" }).min(1, { error: "At least 1" }).max(500) }))
    .min(1, { error: "Scan or add at least one item" }),
})

export const adjustmentSchema = (onHand) =>
  z
    .object({
      direction: z.enum(["remove", "add"]),
      quantity: z.coerce.number().int({ error: "Whole pairs only" }).min(1, { error: "At least 1" }).max(500),
      reason: z.string({ error: "Pick a reason" }).min(1, { error: "Pick a reason" }),
      note: z.string().trim().max(200),
    })
    .refine(({ direction, quantity }) => direction === "add" || quantity <= onHand, {
      error: `Only ${onHand} in stock`,
      path: ["quantity"],
    })
    .refine(({ direction, reason }) => (direction === "remove" ? reason in removeReasons : reason in addReasons), {
      error: "Pick a reason",
      path: ["reason"],
    })
