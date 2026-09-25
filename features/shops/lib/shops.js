import { REGISTER_CODE, REGISTER_ID, SHOP_ID } from "@/features/catalog/lib/catalog"
import { NTN_PATTERN, POSID_PATTERN, STRN_PATTERN } from "@/features/fbr/lib/fbr"
import { newId } from "@/lib/id"

export const ALL_SHOPS = "all"

const PHONE_PATTERN = /^[\d\s+()-]{7,20}$/

export const seedShops = () => [
  { id: SHOP_ID, code: "SH1", name: "Shoe Shop", address: "", city: "Lahore", phone: "", ntn: "", strn: "", active: true },
]

export const registerDefaults = { fbrPosId: "", autoPrint: false, copies: 1, drawerOnCash: true, manualDrawer: true }

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

const clean = (value, max) => (typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, max) : "")

const nextCode = (codes, prefix) => {
  let number = 1
  while (codes.includes(`${prefix}${number}`)) number += 1
  return `${prefix}${number}`
}

export const applySaveShop = (state, { shopId = null, name, address, city, phone, ntn, strn, active = true }) => {
  const existing = shopId ? state.shops.find(({ id }) => id === shopId) : null
  if (shopId && !existing) throw new Error("Shop not found")
  const cleanName = clean(name, 40)
  if (!cleanName) throw new Error("Enter the shop name")
  if (state.shops.some((shop) => shop.id !== shopId && shop.name.toLowerCase() === cleanName.toLowerCase())) throw new Error(`${cleanName} already exists`)
  const cleanPhone = clean(phone, 20)
  if (cleanPhone && !PHONE_PATTERN.test(cleanPhone)) throw new Error("That phone number does not look right")
  const cleanNtn = clean(ntn, 9)
  if (cleanNtn && !NTN_PATTERN.test(cleanNtn)) throw new Error("NTN must be 8 digits, like 1234567-8")
  const cleanStrn = clean(strn, 13)
  if (cleanStrn && !STRN_PATTERN.test(cleanStrn)) throw new Error("STRN must be 13 digits")
  if (existing && !active && state.shifts.some((shift) => shift.shopId === shopId && shift.status === "open")) throw new Error("Close the open shift in this shop first")

  const details = { name: cleanName, address: clean(address, 160), city: clean(city, 40), phone: cleanPhone, ntn: cleanNtn, strn: cleanStrn, active }
  if (existing) {
    const record = { ...existing, ...details }
    return { state: { ...state, shops: state.shops.map((shop) => (shop.id === shopId ? record : shop)) }, record }
  }

  const code = nextCode(state.shops.map((shop) => shop.code), "SH")
  const record = { id: `shop-${newId().slice(0, 8)}`, code, ...details }
  const register = { id: `reg-${newId().slice(0, 8)}`, shopId: record.id, code: `${code}-R1`, name: "Counter 1", ...registerDefaults }
  return { state: { ...state, shops: [...state.shops, record], registers: [...state.registers, register] }, record }
}

export const applySaveRegister = (state, { registerId = null, shopId, name, fbrPosId = "", autoPrint, copies, drawerOnCash, manualDrawer }) => {
  const existing = registerId ? state.registers.find(({ id }) => id === registerId) : null
  if (registerId && !existing) throw new Error("Counter not found")
  const shop = state.shops.find(({ id }) => id === (existing?.shopId ?? shopId))
  if (!shop) throw new Error("Shop not found")
  const cleanName = clean(name, 30) || existing?.name || "Counter"
  const posId = clean(fbrPosId, 6)
  if (posId && !POSID_PATTERN.test(posId)) throw new Error("POSID must be 6 digits")
  if (posId && state.registers.some((register) => register.id !== registerId && register.fbrPosId === posId)) throw new Error("Another counter already uses that POSID")
  const printCopies = Number(copies ?? existing?.copies ?? 1)
  if (![1, 2].includes(printCopies)) throw new Error("Print one or two copies")

  const settings = {
    name: cleanName,
    fbrPosId: posId,
    autoPrint: Boolean(autoPrint ?? existing?.autoPrint),
    copies: printCopies,
    drawerOnCash: Boolean(drawerOnCash ?? existing?.drawerOnCash ?? true),
    manualDrawer: Boolean(manualDrawer ?? existing?.manualDrawer ?? true),
  }
  if (existing) {
    const record = { ...existing, ...settings }
    return { state: { ...state, registers: state.registers.map((register) => (register.id === registerId ? record : register)) }, record }
  }
  const code = nextCode(shopRegisters(state.registers, shop.id).map((register) => register.code), `${shop.code}-R`)
  const record = { id: `reg-${newId().slice(0, 8)}`, shopId: shop.id, code, ...registerDefaults, ...settings }
  return { state: { ...state, registers: [...state.registers, record] }, record }
}

export const shopUsage = (state, shopId) => ({
  products: state.products.filter((product) => product.shopId === shopId).length,
  sales: (state.sales ?? []).filter((sale) => sale.shopId === shopId).length,
  shifts: (state.shifts ?? []).filter((shift) => shift.shopId === shopId).length,
  movements: (state.movements ?? []).filter((movement) => movement.shopId === shopId).length,
  staff: Object.values(state.staff ?? {}).filter((person) => !person.removed && person.shopId === shopId).length,
})

export const applyDeleteShop = (state, { shopId }) => {
  const shop = state.shops.find(({ id }) => id === shopId)
  if (!shop) throw new Error("Shop not found")
  if (state.shops.length <= 1) throw new Error("The last shop cannot be deleted")
  const usage = shopUsage(state, shopId)
  if (usage.staff) throw new Error(`Move its ${usage.staff} staff to another shop first`)
  if (usage.products || usage.sales || usage.shifts || usage.movements) throw new Error("This shop has products or history. Close it instead, so old receipts and reports stay correct.")
  return {
    state: { ...state, shops: state.shops.filter(({ id }) => id !== shopId), registers: state.registers.filter((register) => register.shopId !== shopId) },
    record: shopId,
  }
}

export const SETTING_GROUPS = {
  tax: ["taxEnabled", "taxLabel", "taxRate", "pricesIncludeTax", "fbrEnabled", "fbrServiceFee"],
  payments: ["paymentMethods", "cashRounding"],
  discounts: ["productDiscountEnabled", "cartDiscountEnabled", "managerPin"],
  receipt: ["receipt"],
  counter: ["customerInfoEnabled", "lowStockThreshold", "posColumns"],
}

const SHOP_SETTING_KEYS = Object.values(SETTING_GROUPS).flat()

export const settingsFor = (settings, shops, shopId) => ({ ...settings, ...(shops?.find(({ id }) => id === shopId)?.settings ?? {}) })

export const overriddenKeys = (shop, keys = SHOP_SETTING_KEYS) => keys.filter((key) => Object.hasOwn(shop?.settings ?? {}, key))

export const applySetShopSettings = (state, { shopId, patch }) => {
  const shop = state.shops.find(({ id }) => id === shopId)
  if (!shop) throw new Error("Shop not found")
  const unknown = Object.keys(patch).filter((key) => !SHOP_SETTING_KEYS.includes(key))
  if (unknown.length) throw new Error(`These settings are for the whole group: ${unknown.join(", ")}`)
  const record = { ...shop, settings: { ...shop.settings, ...patch } }
  return { state: { ...state, shops: state.shops.map((item) => (item.id === shopId ? record : item)) }, record }
}

export const applyResetShopSettings = (state, { shopId, keys = SHOP_SETTING_KEYS }) => {
  const shop = state.shops.find(({ id }) => id === shopId)
  if (!shop) throw new Error("Shop not found")
  const record = { ...shop, settings: Object.fromEntries(Object.entries(shop.settings ?? {}).filter(([key]) => !keys.includes(key))) }
  return { state: { ...state, shops: state.shops.map((item) => (item.id === shopId ? record : item)) }, record }
}
