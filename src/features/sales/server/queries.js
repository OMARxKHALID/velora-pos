import { COLLECTIONS as C, fromDoc } from "@/server/db/collections"
import { caseInsensitive } from "@/server/db/indexes"
import { saleForViewer } from "../lib/for-viewer"
import { SHOP_TIME_ZONE, startOfDayIn } from "@/shared/lib/zoned"
import { DAY } from "@/shared/lib/dates"
import { escapeRegExp } from "@/shared/lib/escape-regexp"

export const SALE_RANGES = { today: 1, "7d": 7, "30d": 30, all: null }

const RECEIPT_NUMBER = /^[A-Z0-9]+(?:-[A-Z0-9]+)*-(?:\d{6}|X\d{5})$/i

const receiptIs = (number) => ({ $or: [{ number }, { offlineNumber: number }] })

const searchFilter = (search) => {
  if (RECEIPT_NUMBER.test(search)) return receiptIs(search.toUpperCase())
  if (/^(offline|sold offline)$/i.test(search)) return { offline: true }
  const pattern = new RegExp(escapeRegExp(search), "i")
  return { $or: [{ number: pattern }, { offlineNumber: pattern }, { customerName: pattern }, { customerPhone: pattern }, { "items.productName": pattern }] }
}

export const PAGE_SIZE = 10

const saleFilter = ({ shopIds, viewer, range = "7d", cashierId = null, q = "", timeZone = SHOP_TIME_ZONE, now = Date.now() }) => {
  const days = SALE_RANGES[range]
  const search = q.trim()
  return {
    shopId: { $in: shopIds },
    ...(viewer.role === "cashier" ? { cashierId: viewer.id } : cashierId ? { cashierId } : {}),
    ...(days ? { soldAt: { $gte: new Date(startOfDayIn(timeZone, now) - (days - 1) * DAY) } } : {}),
    ...(search ? searchFilter(search) : {}),
  }
}

export const salesPage = async (db, { page = 1, pageSize = PAGE_SIZE, ...filters }) => {
  const filter = saleFilter(filters)
  const size = Math.min(Math.max(1, pageSize), 100)
  const current = Math.max(1, page)
  const [rows, total] = await Promise.all([
    db.collection(C.sales).find(filter, { sort: { soldAt: -1, _id: -1 }, skip: (current - 1) * size, limit: size }).toArray(),
    db.collection(C.sales).countDocuments(filter),
  ])
  const refunds = await db.collection(C.refunds).find({ saleId: { $in: rows.map(({ _id }) => _id) } }).toArray()
  return {
    page: current,
    pageSize: size,
    total,
    rows: rows.map(fromDoc).map(saleForViewer(filters.viewer)),
    refunds: refunds.map(fromDoc),
  }
}

export const salesForExport = async (db, filters, limit = 10000) =>
  (await db.collection(C.sales).find(saleFilter(filters), { sort: { soldAt: -1 }, limit }).toArray()).map(fromDoc)

export const saleDetail = async (db, { saleId, shopIds, viewer }) => {
  const sale = await db.collection(C.sales).findOne({ _id: saleId, shopId: { $in: shopIds }, ...(viewer.role === "cashier" ? { cashierId: viewer.id } : {}) })
  if (!sale) return null
  const refunds = await db.collection(C.refunds).find({ saleId }, { sort: { createdAt: 1 } }).toArray()
  return { sale: saleForViewer(viewer)(fromDoc(sale)), refunds: refunds.map(fromDoc) }
}

export const findSale = async (db, { shopIds, viewer, number = null, reference = null }) => {
  const filter = {
    shopId: { $in: shopIds },
    ...(viewer.role === "cashier" && number ? { cashierId: viewer.id } : {}),
    ...(number ? receiptIs(String(number).trim().toUpperCase()) : {}),
    ...(reference ? { "payments.reference": String(reference).trim() } : {}),
  }
  if (!number && !reference) return null
  const sale = await db.collection(C.sales).findOne(filter, { projection: { number: 1 }, ...(reference ? { collation: caseInsensitive } : {}) })
  return sale ? { id: sale._id, number: sale.number } : null
}
