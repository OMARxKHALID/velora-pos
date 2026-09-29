"use client"

import { TrashIcon, WarningIcon } from "@phosphor-icons/react"
import { Button } from "@/shared/components/ui/button"
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/shared/components/ui/alert-dialog"
import { roleLabels } from "@/features/auth/lib/roles"

export const RemoveStaffDialog = ({ person, pending, onCancel, onConfirm }) => (
  <AlertDialog open onOpenChange={(open) => !open && !pending && onCancel()}>
    <AlertDialogContent className="sm:max-w-md">
      <AlertDialogHeader>
        <div className="mb-2 flex items-center gap-2 text-destructive">
          <WarningIcon className="size-6" weight="fill" />
          <span className="text-xs font-semibold tracking-label uppercase">Confirm removal</span>
        </div>
        <AlertDialogTitle>Remove {person.name}?</AlertDialogTitle>
        <AlertDialogDescription>
          {person.name} ({roleLabels[person.role]}) leaves the team and can no longer sign in. Their past sales, shifts and stock changes stay in the
          records under their name.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
        <Button variant="destructive" pending={pending} onClick={onConfirm}>
          <TrashIcon />
          Remove staff member
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
)
