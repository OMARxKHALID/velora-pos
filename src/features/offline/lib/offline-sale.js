import { indexCatalog } from "@/features/catalog/lib/catalog"
import { applySale } from "@/features/ledger/lib/rules"
import { cartTotals } from "@/features/pricing/lib/pricing"
import { settingsFor } from "@/features/shops/lib/shops"

const NOT_READY = "This till has no offline receipt numbers yet. Reconnect once to keep selling offline."

const pricingOf = (settings) => ({
  taxEnabled: Boolean(settings.taxEnabled),
  taxRate: Number(settings.taxRate) || 0,
  taxLabel: settings.taxLabel || null,
  productDiscountEnabled: Boolean(settings.productDiscountEnabled),
  cartDiscountEnabled: Boolean(settings.cartDiscountEnabled),
  pricesIncludeTax: Boolean(settings.pricesIncludeTax),
  fbrServiceFee: settings.fbrServiceFee !== false,
  cashRounding: settings.cashRounding ?? 1,
})

export const buildOfflineSale = (state, { cashierId, at }, input) => {
  const shift = state.shifts.find(({ id }) => id === input.shiftId)
  if (!shift || shift.status !== "open") throw new Error("Open a shift before selling")
  if (!shift.receiptBlocks?.length || !shift.registerCode) throw new Error(NOT_READY)
  const shop = state.shops.find(({ id }) => id === shift.shopId)
  const register = state.registers.find(({ id }) => id === shift.registerId)
  const settings = settingsFor(state.shops, shift.shopId)
  const { rows } = cartTotals(input.lines, input.discountPct ?? 0, indexCatalog(state), settings)
  const customer = settings.customerInfoEnabled ? { customerName: input.customerName, customerPhone: input.customerPhone } : {}
  const { record } = applySale(
    { ...state, sales: [], movements: [], exchanges: [], fbrSeq: 0 },
    {
      lines: rows.map(({ variantId, quantity, discount, productDiscount, entry }) => ({ variantId, quantity, discount, productDiscount, entry })),
      payments: input.payments,
      cashierId,
      shiftId: shift.id,
      at,
      clientId: input.clientId,
      offline: true,
      approvedBy: input.approvedBy ?? null,
      settings,
      ...customer,
      shopId: shift.shopId,
      registerId: shift.registerId,
      registerCode: shift.registerCode,
      fbrPosId: register?.fbrPosId ?? null,
      ntn: shop?.ntn ?? null,
      strn: shop?.strn ?? null,
    }
  )
  const payload = {
    clientId: input.clientId,
    shiftId: shift.id,
    soldAt: at,
    total: record.total,
    lines: rows.map(({ variantId, quantity, entry = "scan", variant, product }) => ({ variantId, quantity, entry, unitPrice: variant.price, productDiscountPct: product.discountPct ?? 0 })),
    discountPct: input.discountPct ?? 0,
    approvalToken: input.approvalToken ?? null,
    payments: input.payments,
    ...customer,
    pricing: pricingOf(settings),
  }
  return { shift, sale: { ...record, flags: record.flags.filter((flag) => flag !== "negative_stock") }, payload }
}

export const overlayStock = (stock, entries) => {
  if (!entries.length) return stock
  const next = { ...stock }
  for (const { sale } of entries) for (const { variantId, quantity } of sale.items) next[variantId] = (next[variantId] ?? 0) - quantity
  return next
}
