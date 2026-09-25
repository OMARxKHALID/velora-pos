import { z } from "zod"
import { DEFAULT_MANAGER_PIN } from "@/features/pricing/lib/pricing"
import { formatMoney } from "@/lib/money"

const cashAmount = (error) => z.string().trim().min(1, { error }).pipe(z.coerce.number({ error }))

export const openShiftSchema = z.object({
  openingCash: cashAmount("Enter the cash in the drawer").pipe(
    z.number().min(0, { error: "Cannot be negative" }).max(1000000, { error: "That is more than Rs 1,000,000" })
  ),
})

export const managerPinSchema = (expectedPin = DEFAULT_MANAGER_PIN) =>
  z.object({
    pin: z
      .string()
      .regex(/^\d{4}$/, { error: "Enter the 4-digit supervisor PIN" })
      .refine((pin) => pin === expectedPin, { error: "Wrong PIN" }),
  })

export const MAX_CHANGE = 500000

export const changeTooBig = (change) => change >= MAX_CHANGE

export const cashTenderSchema = (total) =>
  z.object({
    tendered: z.coerce
      .number({ error: "Enter the cash received" })
      .min(total / 100, { error: `Must be at least ${formatMoney(total)}` })
      .refine((rupees) => !changeTooBig(Math.round(rupees * 100) - total), {
        error: `Change would be ${formatMoney(MAX_CHANGE)} or more. Check the amount received`,
      }),
  })

export const closeShiftSchema = z.object({
  countedCash: cashAmount("Enter the cash you counted").pipe(
    z.number().min(0, { error: "Cannot be negative" }).max(10000000, { error: "That looks too large" })
  ),
  note: z.string().trim().max(200, { error: "Keep the note under 200 characters" }),
})
