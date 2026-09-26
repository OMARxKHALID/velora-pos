import { offlineNumbers } from "@/features/pos/lib/receipts"
import { defaultPricingSettings } from "@/features/pricing/lib/pricing"
import { listRegisters, listShops } from "@/features/shops/server/shops"
import { COLLECTIONS as C, fromDoc } from "@/server/db/collections"
import { DAY } from "@/shared/lib/dates"

const HISTORY_DAYS = 120

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
  const since = new Date(Math.floor(now.getTime() / DAY) * DAY - HISTORY_DAYS * DAY)
  const shopIds = user.role === "admin" ? (await db.collection(C.shops).find({}, { projection: { _id: 1 }, sort: { createdAt: 1, _id: 1 } }).toArray()).map(({ _id }) => _id) : [user.shopId]
  const inShops = { shopId: { $in: shopIds } }
  const cashier = user.role === "cashier"
  const all = (name, filter = {}, sort = { _id: 1 }) => db.collection(name).find({ ...inShops, ...filter }, { sort }).toArray()

  const [shops, registers, products, variants, stock, shifts, settings, refunds, usedVariantIds, heldCarts, exchanges, categories] = await Promise.all([
    listShops(db, shopIds),
    listRegisters(db, shopIds),
    all(C.products),
    all(C.variants),
    all(C.stock),
    all(C.shifts, cashier ? { $or: [{ status: "open" }, { cashierId: user.id, openedAt: { $gte: since } }] } : { $or: [{ openedAt: { $gte: since } }, { status: "open" }] }, { openedAt: 1 }),
    db.collection(C.settings).findOne({ _id: shopIds[0] }),
    all(C.refunds, { $or: [{ status: "pending" }, { createdAt: { $gte: since } }], ...(cashier ? { requestedBy: user.id } : {}) }, { createdAt: 1 }),
    cashier ? [] : db.collection(C.movements).distinct("variantId", inShops),
    cashier ? all(C.heldCarts, {}, { parkedAt: -1 }) : [],
    all(C.exchanges, { createdAt: { $gte: since } }, { createdAt: 1 }),
    all(C.categories, {}, { name: 1 }),
  ])

  const { _id: _settingsId, shopId: _settingsShop, ...shopSettings } = settings ?? {}
  return {
    since: since.toISOString(),
    shops,
    registers,
    products: products.map(fromDoc).map((product) => (cashier ? withoutCost(product) : product)),
    variants: variants.map(fromDoc).map((variant) => (cashier ? withoutCost(variant) : variant)),
    stock: Object.fromEntries(stock.map(({ variantId, quantity }) => [variantId, quantity])),
    refunds: refunds.map(fromDoc),
    exchanges: exchanges.map(fromDoc),
    categories: categories.map(fromDoc),
    shifts: (await withOfflineNext(db, shifts)).map(fromDoc),
    usedVariantIds,
    heldCarts: heldCarts.map(fromDoc),
    settings: { ...defaultPricingSettings(), ...shopSettings },
  }
}
