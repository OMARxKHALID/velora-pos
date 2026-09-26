"use client"

import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { ShieldCheckIcon } from "@phosphor-icons/react"
import { Button } from "@/shared/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/shared/components/ui/field"
import { Input } from "@/shared/components/ui/input"
import { Segmented } from "@/shared/components/ui/segmented"
import { approveDiscountAction } from "@/features/auth/actions"
import { approversOf } from "@/features/staff/lib/people"
import { useLedgerStore } from "@/features/ledger/store/ledger-store-provider"
import { managerPinSchema } from "../schemas"

export const ManagerApprovalDialog = ({ shopId, reason, discountPct, onApprove, onClose }) => {
  const staff = useLedgerStore(({ staff }) => staff)
  const supervisors = approversOf(staff, shopId)
  const offline = useLedgerStore(({ offline }) => offline)
  const [chosen, setChosen] = useState(null)
  const approver = supervisors.find(({ id }) => id === chosen) ?? supervisors[0] ?? null
  const form = useForm({ resolver: zodResolver(managerPinSchema), defaultValues: { pin: "" } })
  const { isSubmitting } = form.formState

  const handleSubmit = form.handleSubmit(async ({ pin }) => {
    if (!approver) return
    const result = await approveDiscountAction(approver.id, pin, discountPct).catch(() => ({ error: "Could not reach the server to check the PIN." }))
    if (result.ok) return onApprove(result.approvedBy, result.approvalToken)
    form.setError("pin", { message: result.error })
    form.setValue("pin", "")
  })

  const hint = offline
    ? "Supervisor PINs are checked by the server, so this needs the internet. Reconnect to approve."
    : approver
      ? `Recorded against ${approver.name}.`
      : "There is no active supervisor, so this cannot be approved. Add one in Staff."

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <form onSubmit={handleSubmit} className="space-y-5">
          <DialogHeader>
            <div className="mb-2 flex size-11 items-center justify-center border border-primary/40 text-gold">
              <ShieldCheckIcon className="size-5" />
            </div>
            <DialogTitle>Supervisor approval</DialogTitle>
            <DialogDescription>{reason}</DialogDescription>
          </DialogHeader>
          {supervisors.length > 1 && (
            <Field>
              <FieldLabel>Approving supervisor</FieldLabel>
              <Segmented
                label="Approving supervisor"
                className="flex-wrap"
                options={supervisors.map(({ id, name }) => ({ key: id, label: name }))}
                value={approver?.id}
                onChange={(id) => {
                  setChosen(id)
                  form.clearErrors("pin")
                }}
              />
            </Field>
          )}
          <Controller
            name="pin"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>{approver ? `${approver.name}'s PIN` : "Supervisor PIN"}</FieldLabel>
                <Input
                  {...field}
                  id={field.name}
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  autoFocus
                  autoComplete="off"
                  className="h-12 text-center text-2xl tracking-[0.6em]"
                  aria-invalid={fieldState.invalid}
                />
                <FieldDescription>{hint}</FieldDescription>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!approver || offline || isSubmitting}>
              {isSubmitting ? "Checking…" : "Approve"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
