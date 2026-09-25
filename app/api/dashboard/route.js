import { z } from "zod"
import { RANGES, loadDashboard } from "@/features/analytics/server/dashboard"
import { getSession } from "@/features/auth/server/session"
import { ALL_SHOPS } from "@/features/shops/lib/shops"
import { COLLECTIONS as C } from "@/lib/db/collections"
import { getDb } from "@/lib/db/client"

const noStore = { "Cache-Control": "no-store" }
const querySchema = z.object({ range: z.enum(RANGES).default("7d"), shop: z.string().max(60).default(ALL_SHOPS) })

export const GET = async (request) => {
  const user = await getSession()
  if (!user) return Response.json({ error: "Sign in first" }, { status: 401, headers: noStore })
  if (user.role !== "admin") return Response.json({ error: "Not allowed" }, { status: 403, headers: noStore })
  const query = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams))
  if (!query.success) return Response.json({ error: "Bad query" }, { status: 400, headers: noStore })
  const db = getDb()
  const allShops = (await db.collection(C.shops).find({}, { projection: { _id: 1 } }).toArray()).map(({ _id }) => _id)
  const { range, shop } = query.data
  if (shop !== ALL_SHOPS && !allShops.includes(shop)) return Response.json({ error: "Unknown shop" }, { status: 400, headers: noStore })
  const shopIds = shop === ALL_SHOPS ? allShops : [shop]
  return Response.json(await loadDashboard(db, { shopIds, scope: shop, range }), { headers: noStore })
}
