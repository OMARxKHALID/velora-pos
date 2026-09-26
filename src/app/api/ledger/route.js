import { createHash } from "node:crypto"
import { getSession } from "@/features/auth/server/session"
import { ledgerSnapshot } from "@/features/ledger/server/snapshot"
import { getDb } from "@/server/db/client"
import { denied, noStore } from "@/server/http"

export const GET = async (request) => {
  const user = await getSession()
  if (!user) return denied(401, "Sign in first")
  const body = JSON.stringify(await ledgerSnapshot(getDb(), { user }))
  const etag = `"${createHash("sha1").update(`${user.id}:${body}`).digest("base64url")}"`
  if (request.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers: { ...noStore, ETag: etag } })
  return new Response(body, { headers: { ...noStore, "Content-Type": "application/json", ETag: etag } })
}
