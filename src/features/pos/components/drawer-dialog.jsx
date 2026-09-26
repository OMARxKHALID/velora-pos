"use client"

import { useState } from "react"
import { toast } from "sonner"
import { VaultIcon } from "@phosphor-icons/react"
import { Button } from "@/shared/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog"
import { Field, FieldLabel } from "@/shared/components/ui/field"
import { Input } from "@/shared/components/ui/input"
import { useLedgerStore } from "@/features/ledger/store/ledger-store-provider"

export const DrawerDialog = ({ register, shift, onClose }) => {
  const openDrawer = useLedgerStore(({ openDrawer }) => openDrawer)
  const [note, setNote] = useState("")

  const handleSubmit = async (event) => {
    event.preventDefault()
    try {
      await openDrawer({ registerId: register.id, shiftId: shift.id, reason: "no-sale", note })
      toast.success("Drawer opened", { description: "Logged on this shift's Z-report. No drawer hardware is connected yet." })
      onClose()
    } catch (error) {
      toast.error(error.message)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <form onSubmit={handleSubmit} className="space-y-5">
          <DialogHeader>
            <DialogTitle>Open the drawer</DialogTitle>
            <DialogDescription>Opening the drawer without a sale is recorded with your name and the reason.</DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="drawer-note">Reason</FieldLabel>
            <Input id="drawer-note" value={note} onChange={(event) => setNote(event.target.value)} placeholder="e.g. Change for a Rs 5,000 note" maxLength={120} autoFocus />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!note.trim()}>
              <VaultIcon />
              Open drawer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
