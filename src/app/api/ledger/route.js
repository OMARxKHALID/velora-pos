import { getSession } from "@/features/auth/server/session"
import { ledgerSnapshot } from "@/features/ledger/server/snapshot"
import { getDb } from "@/server/db/client"
import { ledgerStamp } from "@/server/db/ledger-version"
import { denied, noStore } from "@/server/http"

export const GET = async (request) => {
  const user = await getSession()
  if (!user) return denied(401, "Sign in first")
  const db = getDb()
  const etag = await ledgerStamp(db, user)
  if (request.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers: { ...noStore, ETag: etag } })
  const body = JSON.stringify(await ledgerSnapshot(db, { user }))
  return new Response(body, { headers: { ...noStore, "Content-Type": "application/json", ETag: etag } })
}
