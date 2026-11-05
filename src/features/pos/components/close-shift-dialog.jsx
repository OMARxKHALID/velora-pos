"use client"

import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { LockKeyIcon } from "@phosphor-icons/react"
import { Button } from "@/shared/components/ui/button"
import { DialogIcon } from "@/shared/components/ui/dialog-icon"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/shared/components/ui/field"
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/shared/components/ui/input-group"
import { Textarea } from "@/shared/components/ui/textarea"
import { useStaffName } from "@/features/staff/hooks/use-staff-name"
import { useLedgerStore } from "@/features/ledger/store/ledger-store-provider"
import { formatMoney, toPaisa } from "@/shared/lib/money"
import { NOTE_NEEDED_END } from "@/features/ledger/lib/rules"
import { useSettingsFor } from "@/features/shops/hooks/use-shop-scope"
import { closeShiftSchema } from "../schemas"

export const CloseShiftDialog = ({ shift, onClosed, onCancel }) => {
  const closeShift = useLedgerStore(({ closeShift }) => closeShift)
  const nameOf = useStaffName()
  const noteAbove = useSettingsFor(shift.shopId).cashNoteAbove ?? null
  const form = useForm({ resolver: zodResolver(closeShiftSchema), defaultValues: { countedCash: "", note: "" } })

  const handleSubmit = form.handleSubmit(async ({ countedCash, note }) => {
    try {
      onClosed(await closeShift({ shiftId: shift.id, countedCash: toPaisa(countedCash), note }))
    } catch (error) {
      if (error.message.endsWith(NOTE_NEEDED_END)) form.setError("note", { message: error.message }, { shouldFocus: true })
      else toast.error(error.message)
    }
  })

  return (
    <Dialog open onOpenChange={(open) => !open && !form.formState.isSubmitting && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="space-y-5">
          <DialogHeader>
            <DialogIcon>
              <LockKeyIcon />
            </DialogIcon>
            <DialogTitle>Close shift</DialogTitle>
            <DialogDescription>
              {`${nameOf(shift.cashierId)}'s shift. Count every note and coin in the drawer. The expected amount is shown only after you submit.`}
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Controller
              name="countedCash"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Counted cash</FieldLabel>
                  <InputGroup className="h-14">
                    <InputGroupAddon>
                      <InputGroupText>Rs</InputGroupText>
                    </InputGroupAddon>
                    <InputGroupInput {...field} id={field.name} inputMode="numeric" autoFocus className="text-2xl font-semibold tabular-nums" aria-invalid={fieldState.invalid} />
                  </InputGroup>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              name="note"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Note (optional)</FieldLabel>
                  <Textarea {...field} id={field.name} rows={2} placeholder="e.g. Counted twice, drawer handed to Hamza" aria-invalid={fieldState.invalid} />
                  <FieldDescription>
                    Mention anything that could explain a difference, such as a handover.
                    {noteAbove !== null && ` A note is needed if the count is off by ${noteAbove ? `more than ${formatMoney(noteAbove)}` : "any amount"}.`}
                  </FieldDescription>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={form.formState.isSubmitting} onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" pending={form.formState.isSubmitting}>Close shift</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
