import { getSession } from "@/features/auth/server/session"
import { ledgerSnapshot } from "@/features/ledger/server/snapshot"
import { getDb } from "@/lib/db/client"

const noStore = { "Cache-Control": "no-store" }

export const GET = async () => {
  const user = await getSession()
  if (!user) return Response.json({ error: "Sign in first" }, { status: 401, headers: noStore })
  return Response.json(await ledgerSnapshot(getDb(), { user }), { headers: noStore })
}
