import { roundToRupee, sumBy } from "@/shared/lib/money"

export const defaultPricingSettings = () => ({
  taxEnabled: false,
  taxLabel: "Sales tax",
  taxRate: 0,
  productDiscountEnabled: true,
  cartDiscountEnabled: true,
  customerInfoEnabled: true,
  lowStockThreshold: 2,
  posColumns: 6,
  cashRounding: 1,
  paymentMethods: { card: true, jazzcash: false, easypaisa: false, bank: false },
  pricesIncludeTax: false,
  fbrEnabled: false,
  fbrServiceFee: true,
  returnWindowDays: 7,
  cashierDiscountPct: 5,
  discountSteps: [5, 10, 15, 20],
  restockReturns: true,
  returnReasons: ["Wrong size", "Sole defect", "Customer changed mind", "Colour mismatch"],
  cashNoteAbove: null,
  scanBeep: true,
  phoneRequiredAbove: null,
})

export const DISCOUNT_STEP_CHOICES = [5, 10, 15, 20, 25, 30, 40, 50]

export const CASH_NOTE_CHOICES = [null, 0, 10000, 50000, 100000]

export const PHONE_REQUIRED_CHOICES = [null, 500000, 1000000, 2500000, 5000000]

export const MAX_RETURN_REASONS = 8

export const phoneRequiredFor = (settings, total) => settings?.customerInfoEnabled !== false && settings?.phoneRequiredAbove != null && total > settings.phoneRequiredAbove

export const phoneLooksValid = (phone) => (phone?.match(/\d/g)?.length ?? 0) >= 10

export const discountStepsOf = (settings) => DISCOUNT_STEP_CHOICES.filter((pct) => (settings?.discountSteps ?? defaultPricingSettings().discountSteps).includes(pct))

const FBR_SERVICE_FEE = 100

export const effectiveRate = (settings) => (settings.taxEnabled && Number(settings.taxRate) > 0 ? Number(settings.taxRate) : 0)

export const taxFor = (net, rate) => (rate > 0 ? roundToRupee((net * rate) / 100) : 0)

export const taxInside = (net, rate) => (rate > 0 ? roundToRupee((net * rate) / (100 + rate)) : 0)

export const lineTax = (net, rate, inclusive) => (inclusive ? taxInside(net, rate) : taxFor(net, rate))

export const serviceFeeFor = (settings) => (settings.fbrEnabled && settings.fbrServiceFee !== false ? FBR_SERVICE_FEE : 0)

export const itemNet = (item) => item.saleValue ?? item.total

export const lineDiscount = (gross, discountPct) => (discountPct ? Math.floor((gross * discountPct) / 10000) * 100 : 0)

export const cartTotals = (lines, cartDiscountPct, { productById, variantById }, settings) => {
  const taxRate = effectiveRate(settings)
  const inclusive = Boolean(settings.pricesIncludeTax) && taxRate > 0
  const rows = lines.map((line) => {
    const variant = variantById[line.variantId]
    const product = productById[variant.productId]
    const gross = variant.price * line.quantity
    const productDiscount = settings.productDiscountEnabled ? lineDiscount(gross, product.discountPct ?? 0) : 0
    const discount = settings.cartDiscountEnabled ? Math.min(lineDiscount(gross, cartDiscountPct ?? 0), gross - productDiscount) : 0
    const total = gross - productDiscount - discount
    return { ...line, variant, product, gross, productDiscount, discount, total, tax: lineTax(total, taxRate, inclusive) }
  })
  const subtotal = sumBy(rows, ({ gross }) => gross)
  const discountTotal = sumBy(rows, ({ productDiscount, discount }) => productDiscount + discount)
  const net = subtotal - discountTotal
  const taxLabel = settings.taxLabel || "Tax"
  const taxTotal = sumBy(rows, ({ tax }) => tax)
  const serviceFee = rows.length ? serviceFeeFor(settings) : 0
  return {
    rows,
    count: sumBy(rows, ({ quantity }) => quantity),
    subtotal,
    discountTotal,
    taxRate,
    taxLabel,
    taxTotal,
    taxInclusive: inclusive,
    serviceFee,
    total: net + (inclusive ? 0 : taxTotal) + serviceFee,
  }
}

export const saleLinesOf = (rows) => rows.map(({ variantId, quantity, discount, productDiscount, entry }) => ({ variantId, quantity, discount, productDiscount, entry }))

export const netRevenue = (sale) => sale.total + (sale.cashRounding ?? 0) - (sale.taxTotal ?? 0) - (sale.serviceFee ?? 0)

export const netRefund = (refund) => refund.total - (refund.taxTotal ?? 0)
