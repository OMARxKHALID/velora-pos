import { z } from "zod"
import { formatMoney } from "@/lib/money"

const cashAmount = (error) => z.string().trim().min(1, { error }).pipe(z.coerce.number({ error }))

export const openShiftSchema = z.object({
  openingCash: cashAmount("Enter the cash in the drawer").pipe(
    z.number().min(0, { error: "Cannot be negative" }).max(1000000, { error: "That is more than Rs 1,000,000" })
  ),
})

export const managerPinSchema = z.object({
  pin: z.string().regex(/^\d{4}$/, { error: "Enter the 4-digit supervisor PIN" }),
})

export const cashTenderSchema = (total) =>
  z.object({
    tendered: z.coerce
      .number({ error: "Enter the cash received" })
      .min(total / 100, { error: `Must be at least ${formatMoney(total)}` }),
  })

export const closeShiftSchema = z.object({
  countedCash: cashAmount("Enter the cash you counted").pipe(
    z.number().min(0, { error: "Cannot be negative" }).max(10000000, { error: "That looks too large" })
  ),
  note: z.string().trim().max(200, { error: "Keep the note under 200 characters" }),
})
