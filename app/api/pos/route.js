import { getSession } from "@/features/auth/server/session"
import { posState } from "@/features/pos/server/queries"
import { getDb } from "@/lib/db/client"

const noStore = { "Cache-Control": "no-store" }

export const GET = async () => {
  const user = await getSession()
  if (!user) return Response.json({ error: "Sign in first" }, { status: 401, headers: noStore })
  if (user.role !== "cashier") return Response.json({ error: "Not allowed" }, { status: 403, headers: noStore })
  try {
    return Response.json(await posState(getDb(), { shopId: user.shopId }), { headers: noStore })
  } catch (error) {
    if (error?.expose) return Response.json({ error: error.message }, { status: 400, headers: noStore })
    throw error
  }
}
