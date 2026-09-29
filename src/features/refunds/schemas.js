import { z } from "zod"
import { PAYMENT_METHODS } from "@/features/ledger/lib/rules"
import { defaultPricingSettings } from "@/features/pricing/lib/pricing"

export const OTHER_REASON = "Other"

export const reasonOptions = (settings) => [...(settings?.returnReasons ?? defaultPricingSettings().returnReasons), OTHER_REASON]

export const refundRequestSchema = (reasons) =>
  z
  .object({
    lines: z.array(z.object({ variantId: z.string(), quantity: z.number().int().min(0), restock: z.boolean() })),
    reason: z.enum(reasons, { error: "Pick a reason" }),
    note: z.string().trim().max(200),
    method: z.enum(PAYMENT_METHODS),
  })
  .refine(({ lines }) => lines.some(({ quantity }) => quantity > 0), { error: "Pick at least one item to refund", path: ["lines"] })
  .refine(({ reason, note }) => reason !== OTHER_REASON || note.length > 2, { error: "Describe the reason", path: ["note"] })
