"use client"

import { ArrowsClockwiseIcon, WarningIcon } from "@phosphor-icons/react"
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert"
import { Button } from "@/shared/components/ui/button"

const DashboardError = ({ error, retry }) => {
  const handleRetry = () => retry()

  return (
    <Alert variant="destructive" role="alert" className="flex-col items-start gap-3 p-4 text-sm text-foreground">
      <AlertTitle className="flex items-center gap-2">
        <WarningIcon className="size-4 text-destructive" weight="fill" />
        This page could not load.
      </AlertTitle>
      <AlertDescription className="text-muted-foreground">
        Try again. If it keeps happening, tell the owner{error.digest ? <> and quote code <span className="font-mono text-foreground">{error.digest}</span></> : null}.
      </AlertDescription>
      <Button size="sm" variant="outline" onClick={handleRetry}>
        <ArrowsClockwiseIcon />
        Try again
      </Button>
    </Alert>
  )
}

export default DashboardError
