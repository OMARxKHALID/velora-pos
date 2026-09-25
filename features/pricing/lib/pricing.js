import { roundToRupee, sumBy } from "@/lib/money"

export const defaultPricingSettings = () => ({
  taxEnabled: false,
  taxLabel: "Sales tax",
  taxRate: 0,
  productDiscountEnabled: true,
  cartDiscountEnabled: true,
  customerInfoEnabled: true,
  lowStockThreshold: 2,
})

export const effectiveRate = (settings) => (settings.taxEnabled && Number(settings.taxRate) > 0 ? Number(settings.taxRate) : 0)

export const taxFor = (net, rate) => (rate > 0 ? roundToRupee((net * rate) / 100) : 0)

export const lineDiscount = (gross, discountPct) => (discountPct ? Math.floor((gross * discountPct) / 10000) * 100 : 0)

export const cartTotals = (lines, cartDiscountPct, { productById, variantById }, settings) => {
  const rows = lines.map((line) => {
    const variant = variantById[line.variantId]
    const product = productById[variant.productId]
    const gross = variant.price * line.quantity
    const productDiscount = settings.productDiscountEnabled ? lineDiscount(gross, product.discountPct ?? 0) : 0
    const discount = settings.cartDiscountEnabled ? lineDiscount(gross, cartDiscountPct ?? 0) : 0
    return { ...line, variant, product, gross, productDiscount, discount, total: gross - productDiscount - discount }
  })
  const subtotal = sumBy(rows, ({ gross }) => gross)
  const discountTotal = sumBy(rows, ({ productDiscount, discount }) => productDiscount + discount)
  const net = subtotal - discountTotal
  const taxRate = effectiveRate(settings)
  const taxLabel = settings.taxLabel || "Tax"
  const taxTotal = taxFor(net, taxRate)
  return {
    rows,
    count: sumBy(rows, ({ quantity }) => quantity),
    subtotal,
    discountTotal,
    taxRate,
    taxLabel,
    taxTotal,
    total: net + taxTotal,
  }
}

export const netRevenue = (sale) => sale.total - (sale.taxTotal ?? 0)

export const netRefund = (refund) => refund.total - (refund.taxTotal ?? 0)
