import { COLLECTIONS as C, fromDoc } from "@/lib/db/collections"

export const HISTORY_DAYS = 120

const withoutCost = ({ cost: _cost, ...rest }) => rest
const saleForCashier = ({ items, ...sale }) => ({ ...sale, items: items.map(({ unitCost: _unitCost, ...item }) => item) })

export const ledgerSnapshot = async (db, { user, now = new Date() }) => {
  const since = new Date(now.getTime() - HISTORY_DAYS * 24 * 60 * 60 * 1000)
  const shopIds = user.role === "admin" ? (await db.collection(C.shops).find({}, { projection: { _id: 1 } }).toArray()).map(({ _id }) => _id) : [user.shopId]
  const inShops = { shopId: { $in: shopIds } }
  const cashier = user.role === "cashier"
  const all = (name, filter = {}, sort = { _id: 1 }) => db.collection(name).find({ ...inShops, ...filter }, { sort }).toArray()

  const [products, variants, stock, sales, shifts, settings] = await Promise.all([
    all(C.products),
    all(C.variants),
    all(C.stock),
    all(C.sales, { soldAt: { $gte: since }, ...(cashier ? { cashierId: user.id } : {}) }, { soldAt: 1 }),
    all(C.shifts, { $or: [{ openedAt: { $gte: since } }, { status: "open" }] }, { openedAt: 1 }),
    db.collection(C.settings).findOne({ _id: shopIds[0] }),
  ])
  const saleIds = cashier ? sales.map(({ _id }) => _id) : null
  const [refunds, movements, purchases, heldCarts] = await Promise.all([
    all(C.refunds, { createdAt: { $gte: since }, ...(saleIds ? { saleId: { $in: saleIds } } : {}) }, { createdAt: 1 }),
    cashier ? [] : all(C.movements, { createdAt: { $gte: since } }, { createdAt: 1, _id: 1 }),
    cashier ? [] : all(C.purchases, { receivedAt: { $gte: since } }, { receivedAt: 1 }),
    cashier ? all(C.heldCarts, {}, { parkedAt: -1 }) : [],
  ])

  const { _id: _settingsId, shopId: _settingsShop, ...shopSettings } = settings ?? {}
  return {
    since: since.toISOString(),
    products: products.map(fromDoc).map((product) => (cashier ? withoutCost(product) : product)),
    variants: variants.map(fromDoc).map((variant) => (cashier ? withoutCost(variant) : variant)),
    stock: Object.fromEntries(stock.map(({ variantId, quantity }) => [variantId, quantity])),
    sales: sales.map(fromDoc).map((sale) => (cashier ? saleForCashier(sale) : sale)),
    refunds: refunds.map(fromDoc),
    shifts: shifts.map(fromDoc),
    movements: movements.map(fromDoc),
    purchases: purchases.map(fromDoc),
    heldCarts: heldCarts.map(fromDoc),
    settings: shopSettings,
  }
}
