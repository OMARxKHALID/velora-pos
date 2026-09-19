import { sumBy } from "@/lib/money"

export const cartTotals = (lines, discountPct, { productById, variantById }) => {
  const rows = lines.map((line) => {
    const variant = variantById[line.variantId]
    const gross = variant.price * line.quantity
    const discount = Math.floor((gross * discountPct) / 10000) * 100
    return { ...line, variant, product: productById[variant.productId], gross, discount, total: gross - discount }
  })

  return {
    rows,
    count: sumBy(rows, ({ quantity }) => quantity),
    subtotal: sumBy(rows, ({ gross }) => gross),
    discountTotal: sumBy(rows, ({ discount }) => discount),
    total: sumBy(rows, ({ total }) => total),
  }
}
