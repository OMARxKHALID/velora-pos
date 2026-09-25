import { getSession } from "@/features/auth/server/session"
import { catalogSnapshot } from "@/features/catalog/server/queries"
import { shopFor } from "@/features/shops/server/scope"
import { getDb } from "@/lib/db/client"

const noStore = { "Cache-Control": "no-store" }

export const GET = async (request) => {
  const user = await getSession()
  if (!user) return Response.json({ error: "Sign in first" }, { status: 401, headers: noStore })
  try {
    const db = getDb()
    const shopId = await shopFor(db, user, new URL(request.url).searchParams.get("shop"))
    return Response.json(await catalogSnapshot(db, { shopId, includeCost: user.role !== "cashier" }), { headers: noStore })
  } catch (error) {
    if (error?.expose) return Response.json({ error: error.message }, { status: 400, headers: noStore })
    throw error
  }
}
