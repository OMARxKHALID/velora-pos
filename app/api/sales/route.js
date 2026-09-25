import { z } from "zod"
import { staffName } from "@/features/staff/lib/people"
import { SALE_RANGES, salesForExport, salesPage } from "@/features/sales/server/queries"
import { denied, noStore, viewerScope } from "@/features/sales/server/request"
import { COLLECTIONS as C } from "@/lib/db/collections"
import { toCsv } from "@/lib/csv"

const querySchema = z.object({
  range: z.enum(Object.keys(SALE_RANGES)).default("7d"),
  cashier: z.string().max(64).optional(),
  q: z.string().max(80).default(""),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  shop: z.string().max(60).optional(),
  format: z.enum(["json", "csv"]).default("json"),
})

const rupees = (paisa) => (paisa / 100).toFixed(2)

export const GET = async (request) => {
  const query = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams))
  if (!query.success) return denied(400, "Bad query")
  const scope = await viewerScope(query.data.shop)
  if (scope.error) return scope.error
  const { viewer, db, shopIds, timeZone } = scope
  const filters = { shopIds, viewer, timeZone, range: query.data.range, cashierId: query.data.cashier === "all" ? null : query.data.cashier, q: query.data.q }

  if (query.data.format === "json") return Response.json(await salesPage(db, { ...filters, page: query.data.page }), { headers: noStore })

  const sales = await salesForExport(db, filters)
  const people = Object.fromEntries((await db.collection(C.users).find({}, { projection: { name: 1 } }).toArray()).map(({ _id, name }) => [_id, { name }]))
  const csv = toCsv([
    ["Receipt #", "Date/Time", "Cashier", "Customer", "Phone", "Items Count", "Subtotal", "Discount", "Tax", "Total", "Payment Methods"],
    ...sales.map((sale) => [
      sale.number,
      new Date(sale.soldAt).toLocaleString("en-PK", { timeZone, dateStyle: "medium", timeStyle: "short" }),
      staffName(sale.cashierId, people),
      sale.customerName || "",
      sale.customerPhone || "",
      String(sale.items.length),
      rupees(sale.subtotal),
      rupees(sale.discountTotal),
      rupees(sale.taxTotal ?? 0),
      rupees(sale.total),
      sale.payments.map((payment) => `${payment.method.toUpperCase()} (${rupees(payment.amount)})`).join("; "),
    ]),
  ])
  return new Response(`﻿${csv}`, {
    headers: { ...noStore, "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="velora-sales-${new Date().toISOString().slice(0, 10)}.csv"` },
  })
}
