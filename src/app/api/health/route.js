import { getDb } from "@/server/db/client"
import { noStore } from "@/server/http"

export const GET = async () => {
  try {
    await getDb().command({ ping: 1 })
    return Response.json({ status: "ok", database: "up" }, { headers: noStore })
  } catch {
    return Response.json({ status: "error", database: "down" }, { status: 503, headers: noStore })
  }
}
