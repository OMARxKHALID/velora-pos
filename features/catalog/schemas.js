import { z } from "zod"

export const productSchema = z
  .object({
    name: z.string().trim().min(2, { error: "Enter the product name" }).max(60),
    brand: z.string().trim().min(1, { error: "Enter the brand" }).max(30),
    category: z.string().trim().min(1, { error: "Enter the category" }).max(30),
    audience: z.enum(["men", "women", "kids", "unisex"]),
    price: z.coerce.number({ error: "Enter the price" }).int({ error: "Use whole rupees" }).positive({ error: "Price must be above 0" }),
    cost: z.coerce.number({ error: "Enter the cost" }).min(0, { error: "Cost cannot be negative" }),
    discountPct: z.coerce.number().min(0, { error: "Discount cannot be negative" }).max(90, { error: "Discount is too big" }).default(0),
    colors: z.array(z.string().trim().min(1)).min(1, { error: "Add at least one colour" }),
    sizes: z.array(z.string()).min(1, { error: "Pick at least one size" }),
  })
  .refine(({ cost, price }) => cost <= price, { error: "Cost is higher than the price", path: ["cost"] })
