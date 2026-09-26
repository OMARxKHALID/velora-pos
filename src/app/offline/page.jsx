import Link from "next/link"
import { CloudSlashIcon } from "@phosphor-icons/react/ssr"

export const metadata = { title: "Offline · Velora POS" }

const OfflinePage = () => (
  <main className="flex min-h-dvh items-center justify-center p-6">
    <div className="max-w-sm space-y-4 border bg-card p-6 text-center">
      <CloudSlashIcon className="mx-auto size-10 text-warning" />
      <h1 className="font-heading text-lg font-bold tracking-wider uppercase">No connection</h1>
      <p className="text-sm text-muted-foreground">This page was not saved on this device. The sell screen keeps working offline once it has been opened here while online.</p>
      <Link href="/pos" className="inline-flex h-9 items-center border border-primary px-4 text-sm font-semibold text-gold">
        Go to the sell screen
      </Link>
    </div>
  </main>
)

export default OfflinePage
