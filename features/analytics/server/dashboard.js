import { COLLECTIONS as C, fromDoc } from "@/lib/db/collections"
import { SHOP_TIME_ZONE, hourIn, startOfDayIn } from "@/lib/zoned"
import { periodFor } from "../lib/analytics"
import { dashboardView } from "../lib/dashboard-view"

const DAY = 24 * 60 * 60 * 1000
export const RANGES = ["today", "7d", "30d"]

const asTimes = (doc) => {
  const out = fromDoc(doc)
  for (const key of ["soldAt", "createdAt", "decidedAt", "openedAt", "closedAt", "receivedAt"]) if (out[key] instanceof Date) out[key] = out[key].getTime()
  return out
}

export const loadDashboard = async (db, { shopIds, scope, range, now = Date.now() }) => {
  const shops = (await db.collection(C.shops).find({ _id: { $in: shopIds } }, { sort: { _id: 1 } }).toArray()).map(({ _id, name, timezone }) => ({ id: _id, name, timeZone: timezone ?? SHOP_TIME_ZONE }))
  const timeZone = (shops.find(({ id }) => id === scope) ?? shops[0])?.timeZone ?? SHOP_TIME_ZONE
  const period = periodFor(range, now, (at) => startOfDayIn(timeZone, at))
  const since = new Date(Math.min(period.prevFrom, now - 14 * DAY))
  const inShops = { shopId: { $in: shopIds } }

  const [products, variants, stock, sales, refunds, shifts, settings, cashiers, first] = await Promise.all([
    db.collection(C.products).find(inShops).toArray(),
    db.collection(C.variants).find(inShops).toArray(),
    db.collection(C.stock).find(inShops).toArray(),
    db.collection(C.sales).find({ ...inShops, soldAt: { $gte: since } }, { sort: { soldAt: 1 } }).toArray(),
    db.collection(C.refunds).find({ ...inShops, status: "approved", decidedAt: { $gte: new Date(period.prevFrom) } }).toArray(),
    db.collection(C.shifts).find({ ...inShops, status: "closed", closedAt: { $gte: new Date(period.from) } }).toArray(),
    db.collection(C.settings).findOne({ _id: shopIds[0] }),
    db.collection(C.users).find({ role: "cashier", removedAt: { $exists: false } }, { projection: { role: 1 } }).toArray(),
    db.collection(C.sales).findOne(inShops, { sort: { soldAt: 1 }, projection: { soldAt: 1 } }),
  ])

  const loaded = new Set(sales.map(({ _id }) => _id))
  const missing = [...new Set(refunds.map(({ saleId }) => saleId).filter((id) => !loaded.has(id)))]
  const olderSales = missing.length ? await db.collection(C.sales).find({ _id: { $in: missing } }).toArray() : []

  const full = {
    products: products.map(fromDoc),
    variants: variants.map(fromDoc),
    stock: Object.fromEntries(stock.map(({ variantId, quantity }) => [variantId, quantity])),
    sales: [...olderSales, ...sales].map(asTimes),
    refunds: refunds.map(asTimes),
    shifts: shifts.map(asTimes),
  }
  const staff = Object.fromEntries(cashiers.map(({ _id }) => [_id, { id: _id, role: "cashier" }]))

  return dashboardView(full, {
    scope,
    period,
    range,
    staff,
    lowThreshold: settings?.lowStockThreshold ?? 2,
    shops: shops.map(({ id, name }) => ({ id, name })),
    firstSaleAt: first?.soldAt ?? null,
    hourOf: (at) => hourIn(timeZone, at),
    timeZone,
    now,
  })
}
