import { z } from "zod"
import { PAYMENT_METHODS } from "@/features/demo/lib/ledger"

export const refundReasons = ["Wrong size", "Sole defect", "Customer changed mind", "Colour mismatch", "Other"]

export const refundRequestSchema = z
  .object({
    lines: z.array(z.object({ variantId: z.string(), quantity: z.number().int().min(0), restock: z.boolean() })),
    reason: z.enum(refundReasons, { error: "Pick a reason" }),
    note: z.string().trim().max(200),
    method: z.enum(PAYMENT_METHODS),
  })
  .refine(({ lines }) => lines.some(({ quantity }) => quantity > 0), { error: "Pick at least one item to refund", path: ["lines"] })
  .refine(({ reason, note }) => reason !== "Other" || note.length > 2, { error: "Describe the reason", path: ["note"] })
