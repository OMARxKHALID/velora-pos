import { z } from "zod"
import { findSale } from "@/features/sales/server/queries"
import { viewerScope } from "@/features/sales/server/request"
import { denied, noStore } from "@/server/http"

const querySchema = z.object({ number: z.string().max(40).optional(), reference: z.string().max(40).optional() })

export const GET = async (request) => {
  const query = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams))
  if (!query.success || (!query.data.number && !query.data.reference)) return denied(400, "Bad query")
  const scope = await viewerScope(null)
  if (scope.error) return scope.error
  return Response.json({ sale: await findSale(scope.db, { shopIds: scope.shopIds, viewer: scope.viewer, ...query.data }) }, { headers: noStore })
}
