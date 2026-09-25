"use client"

import { ArrowsClockwiseIcon } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useLedgerStore } from "../store/ledger-store-provider"

export const LedgerReady = ({ children }) => {
  const hydrated = useLedgerStore(({ hydrated }) => hydrated)
  const loadError = useLedgerStore(({ loadError }) => loadError)
  const load = useLedgerStore(({ load }) => load)

  if (!hydrated && loadError)
    return (
      <div role="alert" className="flex flex-col items-start gap-3 border border-destructive/40 bg-destructive/10 p-4 text-sm">
        <p>{loadError}</p>
        <Button size="sm" variant="outline" onClick={() => load()}>
          <ArrowsClockwiseIcon />
          Try again
        </Button>
      </div>
    )

  if (!hydrated)
    return (
      <div className="space-y-3">
        <Skeleton className="h-20" />
        <Skeleton className="h-96" />
      </div>
    )

  return children
}
