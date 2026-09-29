import { z } from "zod"
import { cachedDashboard } from "@/features/analytics/server/dashboard"
import { RANGES, customRangeError } from "@/features/analytics/lib/analytics"
import { getSession } from "@/features/auth/server/session"
import { ALL_SHOPS } from "@/features/shops/lib/shops"
import { COLLECTIONS as C } from "@/server/db/collections"
import { getDb } from "@/server/db/client"
import { denied, noStore } from "@/server/http"

const querySchema = z
  .object({ range: z.enum(RANGES).default("7d"), shop: z.string().max(60).default(ALL_SHOPS), from: z.iso.date().optional(), to: z.iso.date().optional() })
  .refine(({ range, from, to }) => range !== "custom" || !customRangeError(from, to))

export const GET = async (request) => {
  const user = await getSession()
  if (!user) return denied(401, "Sign in first")
  if (user.role !== "admin") return denied(403, "Not allowed")
  const query = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams))
  if (!query.success) return denied(400, "Bad query")
  const allShops = (await getDb().collection(C.shops).find({}, { projection: { _id: 1 } }).toArray()).map(({ _id }) => _id)
  const { range, shop, from, to } = query.data
  if (shop !== ALL_SHOPS && !allShops.includes(shop)) return denied(400, "Unknown shop")
  const shopIds = shop === ALL_SHOPS ? allShops : [shop]
  const custom = range === "custom"
  return Response.json(await cachedDashboard(shopIds, shop, range, custom ? from : null, custom ? to : null), { headers: noStore })
}
