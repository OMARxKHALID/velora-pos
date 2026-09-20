import { z } from "zod"
import { formatMoney } from "@/lib/money"

export const DEMO_MANAGER_PIN = "1234"

export const openShiftSchema = z.object({
  openingCash: z.coerce
    .number({ error: "Enter the cash in the drawer" })
    .min(0, { error: "Cannot be negative" })
    .max(1000000, { error: "That is more than Rs 1,000,000" }),
})

export const managerPinSchema = z.object({
  pin: z
    .string()
    .regex(/^\d{4}$/, { error: "Enter the 4-digit manager PIN" })
    .refine((pin) => pin === DEMO_MANAGER_PIN, { error: "Wrong PIN" }),
})

export const cashTenderSchema = (total) =>
  z.object({
    tendered: z.coerce
      .number({ error: "Enter the cash received" })
      .min(total / 100, { error: `Must be at least ${formatMoney(total)}` }),
  })

export const cardPaymentSchema = z.object({
  reference: z.string().trim().max(30, { error: "Slip reference is too long" }).optional(),
})

export const closeShiftSchema = z.object({
  countedCash: z.coerce
    .number({ error: "Enter the cash you counted" })
    .min(0, { error: "Cannot be negative" })
    .max(10000000, { error: "That looks too large" }),
  note: z.string().trim().max(200, { error: "Keep the note under 200 characters" }),
})
