import { z } from "zod"
import { movementsPage } from "@/features/catalog/server/queries"
import { viewerScope } from "@/features/sales/server/request"
import { startOfDayIn } from "@/lib/zoned"
import { denied, noStore } from "@/lib/http"
import { DAY } from "@/lib/dates"

const RANGE_DAYS = { today: 1, "7d": 7, all: null }

const querySchema = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  type: z.enum(["purchase", "sale", "return", "exchange", "adjustment"]).optional(),
  range: z.enum(Object.keys(RANGE_DAYS)).default("7d"),
  q: z.string().max(80).default(""),
  shop: z.string().max(60).optional(),
})

export const GET = async (request) => {
  const query = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams))
  if (!query.success) return denied(400, "Bad query")
  const scope = await viewerScope(query.data.shop)
  if (scope.error) return scope.error
  if (!["admin", "manager"].includes(scope.viewer.role)) return denied(403, "Not allowed")
  const days = RANGE_DAYS[query.data.range]
  const from = days ? new Date(startOfDayIn(scope.timeZone, Date.now()) - (days - 1) * DAY) : null
  return Response.json(await movementsPage(scope.db, { shopIds: scope.shopIds, page: query.data.page, type: query.data.type ?? null, q: query.data.q, from }), { headers: noStore })
}
