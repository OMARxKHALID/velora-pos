import { colorCode, variantKey } from "@/features/catalog/lib/catalog"
import { liveSummary } from "./ledger"

const fromV6 = (state) => {
  const productById = Object.fromEntries((state.products ?? []).map((product) => [product.id, product]))
  const idFor = {}
  const variants = (state.variants ?? []).map((variant) => {
    const { color, size } = variant.attributes
    const id = variantKey(variant.productId, color, size)
    idFor[variant.id] = id
    const code = productById[variant.productId]?.code
    return { ...variant, id, sku: code ? `VS-${code}-${colorCode(color)}-${size}` : variant.sku }
  })
  const skuFor = Object.fromEntries(variants.map(({ id, sku }) => [id, sku]))
  const renamed = (variantId) => idFor[variantId] ?? variantId
  const withIds = (items = []) => items.map((item) => ({ ...item, variantId: renamed(item.variantId) }))

  const refunds = (state.refunds ?? []).map((refund) => ({
    ...refund,
    items: withIds(refund.items),
    approvedInShiftId: refund.status !== "approved" ? null : refund.method === "cash" ? refund.payoutShiftId : refund.shiftId,
  }))
  const sales = (state.sales ?? []).map((sale) => ({
    ...sale,
    items: sale.items.map((item) => ({ ...item, variantId: renamed(item.variantId), sku: skuFor[renamed(item.variantId)] ?? item.sku })),
  }))

  const next = {
    ...state,
    variants,
    sales,
    refunds,
    stock: Object.fromEntries(Object.entries(state.stock ?? {}).map(([variantId, quantity]) => [renamed(variantId), quantity])),
    movements: (state.movements ?? []).map((movement) => ({ ...movement, variantId: renamed(movement.variantId) })),
    purchases: (state.purchases ?? []).map((purchase) => ({ ...purchase, items: withIds(purchase.items) })),
  }
  return {
    ...next,
    shifts: (state.shifts ?? []).map((shift) => (shift.status === "closed" && !shift.summary ? { ...shift, summary: liveSummary(next, shift) } : shift)),
  }
}

export const migrateDemoState = (state, version) => {
  if (version === 6 && state) return fromV6(state)
  return {}
}
