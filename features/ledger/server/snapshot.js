import { offlineNumbers } from "@/features/pos/lib/receipts"
import { COLLECTIONS as C, fromDoc } from "@/lib/db/collections"

export const HISTORY_DAYS = 120

const withoutCost = ({ cost: _cost, ...rest }) => rest

const withOfflineNext = async (db, shifts) => {
  const open = shifts.filter(({ status, receiptBlocks }) => status === "open" && receiptBlocks?.length)
  if (!open.length) return shifts
  const sold = await db.collection(C.sales).find({ shiftId: { $in: open.map(({ _id }) => _id) }, offline: true }, { projection: { shiftId: 1, number: 1, offlineNumber: 1 } }).toArray()
  return shifts.map((shift) => {
    if (!open.includes(shift)) return shift
    const numbers = offlineNumbers(shift.registerCode, shift.receiptBlocks)
    const used = sold.filter(({ shiftId }) => shiftId === shift._id).map(({ number, offlineNumber }) => Math.max(numbers.indexOf(number), numbers.indexOf(offlineNumber)))
    return { ...shift, offlineNext: Math.max(-1, ...used) + 1 }
  })
}

export const ledgerSnapshot = async (db, { user, now = new Date() }) => {
  const since = new Date(now.getTime() - HISTORY_DAYS * 24 * 60 * 60 * 1000)
  const shopIds = user.role === "admin" ? (await db.collection(C.shops).find({}, { projection: { _id: 1 } }).toArray()).map(({ _id }) => _id) : [user.shopId]
  const inShops = { shopId: { $in: shopIds } }
  const cashier = user.role === "cashier"
  const all = (name, filter = {}, sort = { _id: 1 }) => db.collection(name).find({ ...inShops, ...filter }, { sort }).toArray()

  const [products, variants, stock, shifts, settings, refunds, usedVariantIds, heldCarts] = await Promise.all([
    all(C.products),
    all(C.variants),
    all(C.stock),
    all(C.shifts, cashier ? { $or: [{ status: "open" }, { cashierId: user.id, openedAt: { $gte: since } }] } : { $or: [{ openedAt: { $gte: since } }, { status: "open" }] }, { openedAt: 1 }),
    db.collection(C.settings).findOne({ _id: shopIds[0] }),
    all(C.refunds, { $or: [{ status: "pending" }, { createdAt: { $gte: since } }], ...(cashier ? { requestedBy: user.id } : {}) }, { createdAt: 1 }),
    cashier ? [] : db.collection(C.movements).distinct("variantId", inShops),
    cashier ? all(C.heldCarts, {}, { parkedAt: -1 }) : [],
  ])

  const { _id: _settingsId, shopId: _settingsShop, ...shopSettings } = settings ?? {}
  return {
    since: since.toISOString(),
    products: products.map(fromDoc).map((product) => (cashier ? withoutCost(product) : product)),
    variants: variants.map(fromDoc).map((variant) => (cashier ? withoutCost(variant) : variant)),
    stock: Object.fromEntries(stock.map(({ variantId, quantity }) => [variantId, quantity])),
    refunds: refunds.map(fromDoc),
    shifts: (await withOfflineNext(db, shifts)).map(fromDoc),
    usedVariantIds,
    heldCarts: heldCarts.map(fromDoc),
    settings: shopSettings,
  }
}
