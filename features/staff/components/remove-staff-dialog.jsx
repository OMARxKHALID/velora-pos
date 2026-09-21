"use client"

import { TrashIcon, WarningIcon } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { roleLabels } from "@/features/auth/lib/demo-users"

export const RemoveStaffDialog = ({ person, onCancel, onConfirm }) => (
  <Dialog open onOpenChange={(open) => !open && onCancel()}>
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <div className="mb-2 flex items-center gap-2 text-destructive">
          <WarningIcon className="size-6" weight="fill" />
          <span className="text-xs font-semibold tracking-label uppercase">Confirm removal</span>
        </div>
        <DialogTitle>Remove {person.name}?</DialogTitle>
        <DialogDescription>
          {person.name} ({roleLabels[person.role]}) leaves the team and can no longer sign in. Their past sales, shifts and stock changes stay in the
          records under their name. Reset demo data brings the original team back.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter className="gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="destructive" onClick={onConfirm}>
          <TrashIcon />
          Remove staff member
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
)
