import { generateZReportCsv } from "@/features/pos/lib/z-report"
import { viewerScope } from "@/features/sales/server/request"
import { COLLECTIONS as C, fromDoc } from "@/lib/db/collections"
import { denied, noStore } from "@/lib/http"

export const GET = async (_request, { params }) => {
  const { shiftId } = await params
  if (typeof shiftId !== "string" || shiftId.length > 64) return denied(400, "Bad shift id")
  const scope = await viewerScope(null)
  if (scope.error) return scope.error
  const { db, shopIds, viewer } = scope
  const shift = await db.collection(C.shifts).findOne({ _id: shiftId, shopId: { $in: shopIds }, ...(viewer.role === "cashier" ? { cashierId: viewer.id } : {}) })
  if (!shift) return denied(404, "Shift not found")
  const [sales, refunds, people] = await Promise.all([
    db.collection(C.sales).find({ shiftId }, { sort: { soldAt: 1 } }).toArray(),
    db.collection(C.refunds).find({ $or: [{ payoutShiftId: shiftId }, { approvedInShiftId: shiftId }] }).toArray(),
    db.collection(C.users).find({}, { projection: { name: 1 } }).toArray(),
  ])
  const staff = Object.fromEntries(people.map(({ _id, name }) => [_id, { name }]))
  const csv = generateZReportCsv({ sales: sales.map(fromDoc), refunds: refunds.map(fromDoc) }, fromDoc(shift), staff, { timeZone: scope.timeZone })
  const day = new Date(shift.closedAt ?? Date.now()).toISOString().slice(0, 10)
  return new Response(`﻿${csv}`, { headers: { ...noStore, "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="velora-z-report-${shiftId}-${day}.csv"` } })
}
