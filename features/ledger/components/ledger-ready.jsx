"use client"

import { ArrowsClockwiseIcon } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { PanelsSkeleton, TablePageSkeleton } from "@/components/ui/table-skeleton"
import { useLedgerStore } from "../store/ledger-store-provider"

export const LedgerReady = ({ children, skeleton = "table" }) => {
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

  if (!hydrated) return skeleton === "panels" ? <PanelsSkeleton /> : <TablePageSkeleton />

  return children
}
