import { getDb } from "@/lib/db/client"

export const GET = async () => {
  try {
    await getDb().command({ ping: 1 })
    return Response.json({ status: "ok", database: "up" }, { headers: { "Cache-Control": "no-store" } })
  } catch {
    return Response.json({ status: "error", database: "down" }, { status: 503, headers: { "Cache-Control": "no-store" } })
  }
}
