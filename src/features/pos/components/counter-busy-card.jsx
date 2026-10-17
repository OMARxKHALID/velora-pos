"use client"

import { useState } from "react"
import { LockKeyIcon, WarningIcon } from "@phosphor-icons/react"
import { Alert, AlertDescription } from "@/shared/components/ui/alert"
import { Button } from "@/shared/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Checkbox } from "@/shared/components/ui/checkbox"
import { useStaffName } from "@/features/staff/hooks/use-staff-name"
import { useUnsentShiftSales } from "@/features/offline/hooks/use-unsent-shift-sales"
import { CloseShiftDialog } from "./close-shift-dialog"

export const CounterBusyCard = ({ shift, onClosed }) => {
  const nameOf = useStaffName()
  const [closing, setClosing] = useState(false)
  const [closeAnyway, setCloseAnyway] = useState(false)
  const unsent = useUnsentShiftSales(shift)
  const name = nameOf(shift.cashierId)

  return (
    <div className="flex flex-1 items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-3 flex size-12 items-center justify-center border border-primary/40 text-gold">
            <LockKeyIcon className="size-6" />
          </div>
          <CardTitle>Counter {shift.registerCode} is in use</CardTitle>
          <CardDescription>
            {name} has this counter open. To take over, count the drawer and close their shift, then open your own.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>Their sales stay on their shift and report.</p>
          {unsent > 0 && (
            <Alert variant="warning" role="alert" className="flex-col items-start gap-3">
              <AlertDescription className="flex items-start gap-1.5">
                <WarningIcon className="mt-0.5 size-3.5 shrink-0" weight="fill" />
                {`${unsent} of ${name}'s ${unsent === 1 ? "sale is" : "sales are"} saved on this till but not uploaded. Ask ${name} to sign in here and upload first. If you close now, the drawer count will miss ${unsent === 1 ? "it" : "them"} and ${unsent === 1 ? "it uploads" : "they upload"} later, marked as after the shift closed.`}
              </AlertDescription>
              <label className="flex cursor-pointer items-center gap-2 font-medium">
                <Checkbox checked={closeAnyway} onCheckedChange={(checked) => setCloseAnyway(Boolean(checked))} />
                Close their shift anyway
              </label>
            </Alert>
          )}
        </CardContent>
        <CardFooter>
          <Button size="lg" variant="outline" className="w-full" disabled={unsent > 0 && !closeAnyway} onClick={() => setClosing(true)}>
            Count drawer and close their shift
          </Button>
        </CardFooter>
      </Card>
      {closing && <CloseShiftDialog shift={shift} onCancel={() => setClosing(false)} onClosed={onClosed} />}
    </div>
  )
}
