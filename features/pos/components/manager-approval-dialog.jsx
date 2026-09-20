"use client"

import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { ShieldCheckIcon } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useDemoStore } from "@/features/demo/store/demo-store-provider"
import { DEMO_MANAGER_PIN, managerPinSchema } from "../schemas"

export const ManagerApprovalDialog = ({ reason, onApprove, onClose }) => {
  const settings = useDemoStore(({ settings }) => settings)
  const expectedPin = settings?.managerPin || DEMO_MANAGER_PIN
  const form = useForm({ resolver: zodResolver(managerPinSchema(expectedPin)), defaultValues: { pin: "" } })

  const handleSubmit = form.handleSubmit(() => onApprove("u-manager"))

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <form onSubmit={handleSubmit} className="space-y-5">
          <DialogHeader>
            <div className="mb-2 flex size-11 items-center justify-center border border-primary/40 text-gold">
              <ShieldCheckIcon className="size-5" />
            </div>
            <DialogTitle>Manager approval</DialogTitle>
            <DialogDescription>{reason}</DialogDescription>
          </DialogHeader>
          <Controller
            name="pin"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Manager PIN</FieldLabel>
                <Input
                  {...field}
                  id={field.name}
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  autoFocus
                  className="h-12 text-center text-2xl tracking-[0.6em]"
                  aria-invalid={fieldState.invalid}
                />
                <FieldDescription>Supervisor approval PIN ({expectedPin}). Logged against Bilal Ahmed.</FieldDescription>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Approve</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
