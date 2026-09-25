import { z } from "zod"
import { getSession } from "@/features/auth/server/session"
import { movementsPage } from "@/features/catalog/server/queries"
import { shopFor } from "@/features/shops/server/scope"
import { getDb } from "@/lib/db/client"

const noStore = { "Cache-Control": "no-store" }

const querySchema = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  type: z.enum(["purchase", "sale", "return", "adjustment"]).optional(),
  shop: z.string().max(60).optional(),
})

export const GET = async (request) => {
  const user = await getSession()
  if (!user) return Response.json({ error: "Sign in first" }, { status: 401, headers: noStore })
  if (!["admin", "manager"].includes(user.role)) return Response.json({ error: "Not allowed" }, { status: 403, headers: noStore })
  const query = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams))
  if (!query.success) return Response.json({ error: "Bad query" }, { status: 400, headers: noStore })
  try {
    const db = getDb()
    const shopId = await shopFor(db, user, query.data.shop)
    return Response.json(await movementsPage(db, { shopId, page: query.data.page, type: query.data.type ?? null }), { headers: noStore })
  } catch (error) {
    if (error?.expose) return Response.json({ error: error.message }, { status: 400, headers: noStore })
    throw error
  }
}
