import { z } from "zod"
import { USERNAME_PATTERN } from "./lib/rules"

const name = z.string().trim().min(2, { error: "Enter the full name" }).max(60, { error: "Keep the name under 60 characters" })
export const passwordSchema = z.string().min(8, { error: "Use at least 8 characters" }).max(128, { error: "Keep it under 128 characters" })

export const createStaffSchema = z.object({
  name,
  role: z.enum(["manager", "cashier"], { error: "Choose Supervisor or Cashier" }),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(USERNAME_PATTERN, { error: "3 to 30 letters, digits, dots, dashes or underscores" }),
  password: passwordSchema,
  email: z.union([z.literal(""), z.email({ error: "Enter a valid email" })]).default(""),
  phone: z.string().trim().max(30, { error: "Keep the phone number under 30 characters" }).default(""),
})

export const pinSchema = z.string().regex(/^\d{4}$/, { error: "The PIN must be 4 digits" })
