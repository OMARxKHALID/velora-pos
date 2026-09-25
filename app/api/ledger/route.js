import { getSession } from "@/features/auth/server/session"
import { ledgerSnapshot } from "@/features/ledger/server/snapshot"
import { getDb } from "@/lib/db/client"
import { denied, noStore } from "@/lib/http"

export const GET = async () => {
  const user = await getSession()
  if (!user) return denied(401, "Sign in first")
  return Response.json(await ledgerSnapshot(getDb(), { user }), { headers: noStore })
}
