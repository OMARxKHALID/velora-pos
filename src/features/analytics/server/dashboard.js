import { unstable_cache } from "next/cache"
import { getDb } from "@/server/db/client"
import { COLLECTIONS as C, fromDoc } from "@/server/db/collections"
import { SHOP_TIME_ZONE, hourIn, startOfDateIn, startOfDayIn } from "@/shared/lib/zoned"
import { periodBetween, periodFor } from "../lib/analytics"
import { dashboardView } from "../lib/dashboard-view"
import { DAY } from "@/shared/lib/dates"

export const RANGES = ["today", "7d", "30d", "custom"]
const PACE_DAYS = 28

const UNUSED_SALE_FIELDS = { fbr: 0, customerName: 0, customerPhone: 0, "items.productName": 0, "items.sku": 0, "items.attributes": 0, "items.pctCode": 0, "payments.reference": 0 }

const asTimes = (doc) => {
  const out = fromDoc(doc)
  for (const key of ["soldAt", "createdAt", "decidedAt", "openedAt", "closedAt", "receivedAt"]) if (out[key] instanceof Date) out[key] = out[key].getTime()
  return out
}

export const loadDashboard = async (db, { shopIds, scope, range, from, to, now = Date.now() }) => {
  const shops = (await db.collection(C.shops).find({ _id: { $in: shopIds } }, { sort: { createdAt: 1, _id: 1 } }).toArray()).map(({ _id, name, timezone }) => ({ id: _id, name, timeZone: timezone ?? SHOP_TIME_ZONE }))
  const timeZone = (shops.find(({ id }) => id === scope) ?? shops[0])?.timeZone ?? SHOP_TIME_ZONE
  const today = startOfDayIn(timeZone, now)
  const customTo = range === "custom" ? Math.min(startOfDateIn(timeZone, to), today) : null
  const period = range === "custom" ? periodBetween(Math.min(startOfDateIn(timeZone, from), customTo), customTo, now) : periodFor(range, now, (at) => startOfDayIn(timeZone, at))
  const since = new Date(Math.min(period.prevFrom, now - PACE_DAYS * DAY))
  const inShops = { shopId: { $in: shopIds } }

  const [products, variants, stock, sales, refunds, shifts, settings, cashiers, first, categories] = await Promise.all([
    db.collection(C.products).find(inShops).toArray(),
    db.collection(C.variants).find(inShops).toArray(),
    db.collection(C.stock).find(inShops).toArray(),
    db.collection(C.sales).find({ ...inShops, soldAt: { $gte: since } }, { sort: { soldAt: 1 }, projection: UNUSED_SALE_FIELDS }).toArray(),
    db.collection(C.refunds).find({ ...inShops, status: "approved", decidedAt: { $gte: new Date(period.prevFrom) } }).toArray(),
    db.collection(C.shifts).find({ ...inShops, status: "closed", closedAt: { $gte: new Date(period.from) } }).toArray(),
    db.collection(C.settings).find({ _id: { $in: shopIds } }, { projection: { lowStockThreshold: 1 } }).toArray(),
    db.collection(C.users).find({ role: "cashier", removedAt: { $exists: false } }, { projection: { role: 1 } }).toArray(),
    db.collection(C.sales).findOne(inShops, { sort: { soldAt: 1 }, projection: { soldAt: 1 } }),
    db.collection(C.categories).find(inShops, { projection: { shopId: 1, name: 1, lowStockAt: 1 } }).toArray(),
  ])

  const loaded = new Set(sales.map(({ _id }) => _id))
  const missing = [...new Set(refunds.map(({ saleId }) => saleId).filter((id) => !loaded.has(id)))]
  const olderSales = missing.length ? await db.collection(C.sales).find({ _id: { $in: missing } }, { projection: UNUSED_SALE_FIELDS }).toArray() : []

  const full = {
    products: products.map(fromDoc),
    variants: variants.map(fromDoc),
    stock: Object.fromEntries(stock.map(({ variantId, quantity }) => [variantId, quantity])),
    sales: [...olderSales, ...sales].map(asTimes),
    refunds: refunds.map(asTimes),
    shifts: shifts.map(asTimes),
    categories: categories.map(fromDoc),
  }
  const thresholds = Object.fromEntries(settings.map(({ _id, lowStockThreshold }) => [_id, lowStockThreshold]))
  const staff = Object.fromEntries(cashiers.map(({ _id }) => [_id, { id: _id, role: "cashier" }]))

  return dashboardView(full, {
    scope,
    period,
    range,
    staff,
    lowThreshold: (shopId) => thresholds[shopId] ?? 2,
    shops: shops.map(({ id, name }) => ({ id, name })),
    firstSaleAt: first?.soldAt ?? null,
    hourOf: (at) => hourIn(timeZone, at),
    timeZone,
    now,
  })
}

export const cachedDashboard = unstable_cache((shopIds, scope, range, from, to) => loadDashboard(getDb(), { shopIds, scope, range, from, to }), ["dashboard", "v3"], { revalidate: 30 })
