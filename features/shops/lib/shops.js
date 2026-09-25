export const ALL_SHOPS = "all"

export const shopName = (scope, shops) => (scope === ALL_SHOPS ? "All shops" : (shops.find(({ id }) => id === scope)?.name ?? "Shop"))

export const scopeState = (state, scope) => {
  if (scope === ALL_SHOPS) return state
  const inShop = ({ shopId }) => shopId === scope
  const products = state.products.filter(inShop)
  const productIds = new Set(products.map(({ id }) => id))
  return {
    ...state,
    products,
    variants: state.variants.filter(({ productId }) => productIds.has(productId)),
    sales: (state.sales ?? []).filter(inShop),
    refunds: (state.refunds ?? []).filter(inShop),
    shifts: (state.shifts ?? []).filter(inShop),
    movements: (state.movements ?? []).filter(inShop),
    purchases: (state.purchases ?? []).filter(inShop),
  }
}
