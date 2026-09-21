"use client"

import { useState } from "react"
import { PauseIcon } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export const MAX_HOLD_LABEL = 40

export const HoldSaleDialog = ({ suggestion, onHold, onClose }) => {
  const [label, setLabel] = useState("")

  const handleSubmit = (event) => {
    event.preventDefault()
    onHold(label.trim())
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <form onSubmit={handleSubmit} className="space-y-5">
          <DialogHeader>
            <div className="mb-2 flex size-11 items-center justify-center border border-primary/40 text-gold">
              <PauseIcon className="size-5" />
            </div>
            <DialogTitle>Hold this sale</DialogTitle>
            <DialogDescription>Serve the next customer and come back to this cart later.</DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="hold-label">Name it (optional)</FieldLabel>
            <Input
              id="hold-label"
              autoFocus
              autoComplete="off"
              maxLength={MAX_HOLD_LABEL}
              value={label}
              placeholder={suggestion}
              onChange={(event) => setLabel(event.target.value)}
            />
            <FieldDescription>A customer name or ticket makes it easy to find. Press Enter to hold.</FieldDescription>
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Hold sale</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
