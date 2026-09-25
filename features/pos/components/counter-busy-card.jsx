"use client"

import { useState } from "react"
import { LockKeyIcon } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { REGISTER_CODE } from "@/features/catalog/lib/catalog"
import { useStaffName } from "@/features/staff/hooks/use-staff-name"
import { CloseShiftDialog } from "./close-shift-dialog"

export const CounterBusyCard = ({ user, shift, onClosed }) => {
  const nameOf = useStaffName()
  const [closing, setClosing] = useState(false)

  return (
    <div className="flex flex-1 items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-3 flex size-12 items-center justify-center border border-primary/40 text-gold">
            <LockKeyIcon className="size-6" />
          </div>
          <CardTitle>Counter {REGISTER_CODE} is in use</CardTitle>
          <CardDescription>
            {nameOf(shift.cashierId)} has this counter open. To take over, count the drawer and close their shift, then open your own.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">Their sales stay on their shift and report.</CardContent>
        <CardFooter>
          <Button size="lg" variant="outline" className="w-full" onClick={() => setClosing(true)}>
            Count drawer and close their shift
          </Button>
        </CardFooter>
      </Card>
      {closing && <CloseShiftDialog shift={shift} user={user} onCancel={() => setClosing(false)} onClosed={onClosed} />}
    </div>
  )
}
