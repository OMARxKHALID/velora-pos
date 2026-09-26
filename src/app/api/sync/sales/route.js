import { getSession } from "@/features/auth/server/session"
import { syncOfflineSale } from "@/features/pos/server/sales"
import { withoutCosts } from "@/features/sales/lib/for-viewer"
import { getDb, getMongoClient } from "@/server/db/client"
import { authEnv } from "@/config/env"
import { denied, noStore } from "@/server/http"

const sameOrigin = (request) => {
  const origin = request.headers.get("origin")
  if (!origin) return true
  try {
    return new URL(origin).host === new URL(request.url).host
  } catch {
    return false
  }
}

export const POST = async (request) => {
  if (!sameOrigin(request)) return denied(403, "Not allowed")
  if (!request.headers.get("content-type")?.startsWith("application/json")) return denied(415, "Send JSON")
  const user = await getSession()
  if (!user) return denied(401, "Your session has ended. Sign in again.")
  if (user.role !== "cashier") return denied(403, "Only cashiers upload offline sales")
  const body = await request.json().catch(() => null)
  if (!body) return denied(400, "Send JSON")
  try {
    const sale = await syncOfflineSale({ db: getDb(), client: getMongoClient(), user, shopId: user.shopId, approvalSecret: authEnv().BETTER_AUTH_SECRET }, body)
    return Response.json({ sale: withoutCosts(sale) }, { headers: noStore })
  } catch (error) {
    if (error?.expose) return denied(422, error.message)
    throw error
  }
}
