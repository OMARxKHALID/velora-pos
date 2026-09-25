import { z } from "zod"
import { makeVariant, sameColor, sizePresets, variantKey } from "../../lib/catalog"

const fieldsSchema = z
  .object({
    category: z.string().trim().min(1, { error: "Enter the category" }).max(30),
    audience: z.enum(["men", "women", "kids", "unisex"], { error: "Choose men, women, kids or unisex" }),
    colors: z.array(z.string().trim().min(1).max(30)).min(1, { error: "Add at least one colour" }).max(20, { error: "Use at most 20 colours" }),
    sizes: z
      .array(z.coerce.string().regex(/^\d{2}$/, { error: "Sizes are EU sizes like 42" }))
      .min(1, { error: "Pick at least one size" })
      .max(20, { error: "Use at most 20 sizes" }),
  })
  .superRefine(({ colors, sizes }, context) => {
    const clash = colors.flatMap((color, index) => colors.slice(index + 1).filter((other) => sameColor(other, color)).map((other) => [color, other]))[0]
    if (clash) context.addIssue({ code: "custom", path: ["colors"], message: `${clash[0]} and ${clash[1]} are the same colour` })
    if (new Set(sizes).size !== sizes.length) context.addIssue({ code: "custom", path: ["sizes"], message: "Each size can only be listed once" })
  })
  .transform((fields) => ({ ...fields, sizes: fields.sizes.toSorted((a, b) => Number(a) - Number(b)) }))

export const footwear = {
  type: "footwear",
  label: "Footwear",
  unit: { one: "pair", many: "pairs" },
  stockView: "matrix",
  tracksLots: false,
  sizeRuns: sizePresets,
  fieldsSchema,
  fieldsOf: ({ category, audience, colors, sizes }) => ({ category, audience, colors, sizes }),
  variantOptions: (product) => product.colors.flatMap((color) => product.sizes.map((size) => ({ color, size: String(size) }))),
  variantId: (productId, { color, size }) => variantKey(productId, color, size),
  newVariant: (product, { color, size }, serial) => makeVariant(product, color, size, serial),
  labelFor: ({ color, size }) => `${color} · EU ${size}`,
}
