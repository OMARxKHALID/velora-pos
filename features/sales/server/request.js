import "server-only"
import { getSession } from "@/features/auth/server/session"
import { COLLECTIONS as C } from "@/lib/db/collections"
import { getDb } from "@/lib/db/client"
import { SHOP_TIME_ZONE } from "@/lib/zoned"

export const noStore = { "Cache-Control": "no-store" }

export const denied = (status, error) => Response.json({ error }, { status, headers: noStore })

export const viewerScope = async (requestedShop) => {
  const viewer = await getSession()
  if (!viewer) return { error: denied(401, "Sign in first") }
  const db = getDb()
  const shops = await db.collection(C.shops).find(viewer.role === "admin" ? {} : { _id: viewer.shopId }, { projection: { _id: 1, timezone: 1 } }).toArray()
  const chosen = requestedShop && requestedShop !== "all" ? shops.filter(({ _id }) => _id === requestedShop) : shops
  if (!chosen.length) return { error: denied(400, "Unknown shop") }
  return { viewer, db, shopIds: chosen.map(({ _id }) => _id), timeZone: chosen[0].timezone ?? SHOP_TIME_ZONE }
}
