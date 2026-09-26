import { REGISTER_CODE, REGISTER_ID, SHOP_ID } from "@/features/catalog/lib/catalog"
import { defaultPricingSettings } from "@/features/pricing/lib/pricing"

export const ALL_SHOPS = "all"

export const seedShops = () => [
  { id: SHOP_ID, code: "SH1", name: "Shoe Shop", address: "", city: "Lahore", phone: "", ntn: "", strn: "", active: true },
]

const registerDefaults = { fbrPosId: "", autoPrint: false, copies: 1, drawerOnCash: true, manualDrawer: true }

export const seedRegisters = () => [{ id: REGISTER_ID, shopId: SHOP_ID, code: REGISTER_CODE, name: "Counter 1", ...registerDefaults }]

export const shopName = (scope, shops) => (scope === ALL_SHOPS ? "All shops" : (shops?.find(({ id }) => id === scope)?.name ?? "Shop"))

export const staffShopId = (person) => person?.shopId ?? (person?.role === "admin" || !person ? null : SHOP_ID)

export const shopRegisters = (registers, shopId) => registers.filter((register) => register.shopId === shopId)

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

export const settingsFor = (shops, shopId) => (shops.find(({ id }) => id === shopId) ?? shops[0])?.settings ?? defaultPricingSettings()
