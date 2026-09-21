"use client"

import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { LockKeyIcon } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group"
import { Textarea } from "@/components/ui/textarea"
import { useStaffName } from "@/features/demo/hooks/use-directory"
import { useDemoStore } from "@/features/demo/store/demo-store-provider"
import { toPaisa } from "@/lib/money"
import { closeShiftSchema } from "../schemas"

export const CloseShiftDialog = ({ shift, user, onClosed, onCancel }) => {
  const closeShift = useDemoStore(({ closeShift }) => closeShift)
  const nameOf = useStaffName()
  const form = useForm({ resolver: zodResolver(closeShiftSchema), defaultValues: { countedCash: "", note: "" } })

  const handleSubmit = form.handleSubmit(({ countedCash, note }) => {
    try {
      onClosed(closeShift({ shiftId: shift.id, countedCash: toPaisa(countedCash), closedBy: user.id, note }))
    } catch (error) {
      toast.error(error.message)
    }
  })

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="space-y-5">
          <DialogHeader>
            <div className="mb-2 flex size-11 items-center justify-center border border-primary/40 text-gold">
              <LockKeyIcon className="size-5" />
            </div>
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
                  <FieldDescription>Mention anything that could explain a difference, such as a handover.</FieldDescription>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit">Close shift</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
