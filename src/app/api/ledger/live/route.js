import { getSession } from "@/features/auth/server/session"
import { getDb } from "@/server/db/client"
import { watchLedger } from "@/server/db/ledger-version"
import { denied, noStore } from "@/server/http"

const PING_MS = 25_000
const RETRY_MS = 3_000
const encoder = new TextEncoder()

export const GET = async (request) => {
  const user = await getSession()
  if (!user) return denied(401, "Sign in first")

  let stop = () => {}

  const body = new ReadableStream({
    start: (controller) => {
      let open = true
      const send = (text) => {
        if (!open) return
        try {
          controller.enqueue(encoder.encode(text))
        } catch {
          stop()
        }
      }
      const ping = setInterval(() => send(": ping\n\n"), PING_MS)
      const unwatch = watchLedger(getDb(), user, (kind) => (kind === "change" ? send("event: changed\ndata: \n\n") : stop()))
      stop = () => {
        if (!open) return
        open = false
        clearInterval(ping)
        unwatch()
        try {
          controller.close()
        } catch {}
      }
      request.signal.addEventListener("abort", () => stop())
      send(`retry: ${RETRY_MS}\n\n`)
    },
    cancel: () => stop(),
  })

  return new Response(body, { headers: { ...noStore, "Content-Type": "text/event-stream", "X-Accel-Buffering": "no" } })
}
