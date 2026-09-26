import { z } from "zod"
import { parseCsv, toCsv } from "@/shared/lib/csv"
import { ONE_SIZE, PCT_PATTERN, SIZE_TYPES, colorCode, indexCatalog } from "./catalog"

const headers = ["product", "brand", "category", "audience", "color", "size", "price", "cost", "barcode", "stock", "sku", "status", "pct_code"]
const required = ["product", "brand", "category", "audience", "color", "size", "price", "cost"]

export const exportCatalogCsv = (state) => {
  const { productById } = indexCatalog(state)
  const rows = state.variants.map((variant) => {
    const product = productById[variant.productId]
    return [
      product.name,
      product.brand,
      product.category,
      product.audience,
      variant.attributes.color,
      variant.attributes.size,
      variant.price / 100,
      variant.cost / 100,
      variant.barcode,
      state.stock[variant.id] ?? 0,
      variant.sku,
      product.status === "active" && variant.active ? "active" : "archived",
      product.pctCode ?? "",
    ]
  })
  return toCsv([headers, ...rows])
}

export const importTemplateCsv = () =>
  toCsv([
    [...headers.slice(0, 9), "receive"],
    ["Velora Crest Sneaker", "Velora", "Sneakers", "men", "Black", "42", "13500", "6000", "", "4"],
    ["Velora Crest Sneaker", "Velora", "Sneakers", "men", "Black", "43", "13500", "6000", "", "4"],
    ["Velora Crest Sneaker", "Velora", "Sneakers", "men", "White", "42", "13500", "6000", "8901234567890", "2"],
  ])

const rowSchema = z
  .object({
    product: z.string().trim().min(2, { error: "product name is missing" }),
    brand: z.string().trim().min(1, { error: "brand is missing" }),
    category: z.string().trim().min(1, { error: "category is missing" }),
    audience: z.string().trim().toLowerCase().pipe(z.enum(["men", "women", "kids", "unisex"], { error: "audience must be men, women, kids or unisex" })),
    color: z.string().trim().min(1, { error: "color is missing" }),
    size: z
      .string()
      .trim()
      .transform((size) => (/^one ?size$/i.test(size) ? ONE_SIZE : /^\d+$/.test(size) ? size : size.toUpperCase()))
      .refine((size) => /^\d{2}$/.test(size) || SIZE_TYPES.clothing.sizes.includes(size) || size === ONE_SIZE, { error: "size must be an EU size like 42, a clothing size like M, or One size" }),
    price: z.coerce.number({ error: "price must be a number" }).int({ error: "price must be whole rupees" }).positive({ error: "price must be above 0" }),
    cost: z.coerce.number({ error: "cost must be a number" }).min(0, { error: "cost cannot be negative" }),
    barcode: z.string().trim().regex(/^(\d{8,14})?$/, { error: "barcode must be 8 to 14 digits" }),
    pctCode: z.string().trim().refine((code) => !code || PCT_PATTERN.test(code), { error: "pct_code must look like 6403.9900" }).default(""),
    stock: z.coerce.number({ error: "receive must be a number" }).int({ error: "receive must be a whole number" }).min(0, { error: "receive cannot be negative" }).default(0),
  })
  .refine(({ cost, price }) => cost <= price, { error: "cost is higher than price" })
  .transform((row) => ({ ...row, price: Math.round(row.price * 100), cost: Math.round(row.cost * 100) }))

export const parseCatalogImport = (text) => {
  const [head = [], ...lines] = parseCsv(text)
  const columns = head.map((cell) => cell.trim().toLowerCase())
  const missing = required.filter((column) => !columns.includes(column))
  if (missing.length) return { rows: [], errors: [{ line: 1, message: `Missing columns: ${missing.join(", ")}` }], total: lines.length }

  const rows = []
  const errors = []
  lines.forEach((cells, index) => {
    const record = Object.fromEntries(columns.map((column, position) => [column, cells[position] ?? ""]))
    const parsed = rowSchema.safeParse({ ...record, barcode: record.barcode ?? "", pctCode: record.pct_code ?? "", stock: record.receive || 0 })
    if (parsed.success) rows.push(parsed.data)
    else errors.push({ line: index + 2, message: parsed.error.issues.map(({ message }) => message).join("; ") })
  })

  const seen = new Map()
  for (const row of rows) {
    const key = `${row.product}|${row.brand}`.toLowerCase() + `|${colorCode(row.color)}|${row.size}`
    if (seen.has(key)) errors.push({ line: 0, message: `${row.product} ${row.color} ${row.size} appears twice` })
    seen.set(key, true)
    if (!row.barcode) continue
    if (seen.has(row.barcode)) errors.push({ line: 0, message: `barcode ${row.barcode} appears twice` })
    seen.set(row.barcode, true)
  }

  return { rows, errors, total: lines.length }
}
