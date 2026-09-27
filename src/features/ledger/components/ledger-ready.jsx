"use client"

import { LoadError } from "@/shared/components/ui/alert"
import { TablePageSkeleton } from "@/shared/components/ui/table-skeleton"
import { useLedgerStore } from "../store/ledger-store-provider"

export const LedgerReady = ({ children, fallback = <TablePageSkeleton /> }) => {
  const hydrated = useLedgerStore(({ hydrated }) => hydrated)
  const loadError = useLedgerStore(({ loadError }) => loadError)
  const load = useLedgerStore(({ load }) => load)

  if (!hydrated && loadError) return <LoadError message={loadError} onRetry={load} />
  if (!hydrated) return fallback

  return children
}
