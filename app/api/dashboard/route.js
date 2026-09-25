import { z } from "zod"
import { RANGES, loadDashboard } from "@/features/analytics/server/dashboard"
import { getSession } from "@/features/auth/server/session"
import { ALL_SHOPS } from "@/features/shops/lib/shops"
import { COLLECTIONS as C } from "@/lib/db/collections"
import { getDb } from "@/lib/db/client"
import { denied, noStore } from "@/lib/http"

const querySchema = z.object({ range: z.enum(RANGES).default("7d"), shop: z.string().max(60).default(ALL_SHOPS) })

export const GET = async (request) => {
  const user = await getSession()
  if (!user) return denied(401, "Sign in first")
  if (user.role !== "admin") return denied(403, "Not allowed")
  const query = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams))
  if (!query.success) return denied(400, "Bad query")
  const db = getDb()
  const allShops = (await db.collection(C.shops).find({}, { projection: { _id: 1 } }).toArray()).map(({ _id }) => _id)
  const { range, shop } = query.data
  if (shop !== ALL_SHOPS && !allShops.includes(shop)) return denied(400, "Unknown shop")
  const shopIds = shop === ALL_SHOPS ? allShops : [shop]
  return Response.json(await loadDashboard(db, { shopIds, scope: shop, range }), { headers: noStore })
}
