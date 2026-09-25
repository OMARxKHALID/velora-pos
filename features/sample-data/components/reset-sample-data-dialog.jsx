"use client"

import { useTransition } from "react"
import { ArrowCounterClockwiseIcon } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useResetSampleData } from "@/features/sample-data/hooks/use-reset-sample-data"

export const ResetSampleDataDialog = ({ open, onOpenChange }) => {
  const reset = useResetSampleData()
  const [pending, startTransition] = useTransition()

  const handleReset = () =>
    startTransition(async () => {
      await reset()
      onOpenChange(false)
    })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset sample data?</DialogTitle>
          <DialogDescription>
            Sales, stock, shifts, returns and settings go back to a fresh 30-day sample. Staff you added are deleted, and everyone else goes back to the sample password and PIN. You stay signed in.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Keep my data</DialogClose>
          <Button variant="destructive" disabled={pending} onClick={handleReset}>
            <ArrowCounterClockwiseIcon />
            {pending ? "Resetting…" : "Reset sample data"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
