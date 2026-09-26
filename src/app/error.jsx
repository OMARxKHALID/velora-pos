"use client"

import Link from "next/link"
import { ArrowsClockwiseIcon, WarningIcon } from "@phosphor-icons/react"
import { Button, buttonVariants } from "@/shared/components/ui/button"

const AppError = ({ error, retry }) => {
  const handleRetry = () => retry()

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div role="alert" className="max-w-sm space-y-4 border bg-card p-6 text-center">
        <WarningIcon className="mx-auto size-10 text-destructive" />
        <h1 className="font-heading text-lg font-bold tracking-wider uppercase">Something went wrong</h1>
        <p className="text-sm text-muted-foreground">
          Velora could not load this screen. Try again in a moment.
          {error.digest ? (
            <>
              {" "}If it keeps happening, tell the owner the code <span className="font-mono text-foreground">{error.digest}</span>.
            </>
          ) : null}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button variant="outline" onClick={handleRetry}>
            <ArrowsClockwiseIcon />
            Try again
          </Button>
          <Link href="/" className={buttonVariants()}>
            Go to sign in
          </Link>
        </div>
      </div>
    </main>
  )
}

export default AppError
