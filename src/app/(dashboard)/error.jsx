"use client"

import { ArrowsClockwiseIcon, WarningIcon } from "@phosphor-icons/react"
import { Button } from "@/shared/components/ui/button"

const DashboardError = ({ error, retry }) => {
  const handleRetry = () => retry()

  return (
    <div role="alert" className="flex flex-col items-start gap-3 border border-destructive/40 bg-destructive/10 p-4 text-sm">
      <p className="flex items-center gap-2 font-semibold">
        <WarningIcon className="size-4 text-destructive" weight="fill" />
        This page could not load.
      </p>
      <p className="text-muted-foreground">
        Try again. If it keeps happening, tell the owner{error.digest ? <> and quote code <span className="font-mono text-foreground">{error.digest}</span></> : null}.
      </p>
      <Button size="sm" variant="outline" onClick={handleRetry}>
        <ArrowsClockwiseIcon />
        Try again
      </Button>
    </div>
  )
}

export default DashboardError
