"use client"

import { useState } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Button } from "@/shared/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/shared/components/ui/toggle-group"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/shared/components/ui/field"
import { Input } from "@/shared/components/ui/input"
import { Segmented } from "@/shared/components/ui/segmented"
import { Textarea } from "@/shared/components/ui/textarea"
import { useLedgerStore } from "@/features/ledger/store/ledger-store-provider"
import { addReasons, adjustmentSchema, removeReasons } from "../schemas"
import { newId } from "@/shared/lib/id"
import { sizeLabel } from "@/features/catalog/lib/catalog"

const AdjustForm = ({ row, size, onHand, onDone }) => {
  const adjustStock = useLedgerStore(({ adjustStock }) => adjustStock)
  const [clientId] = useState(newId)
  const form = useForm({
    resolver: zodResolver(adjustmentSchema(onHand)),
    defaultValues: { direction: "remove", quantity: "1", reason: "", note: "" },
  })
  const direction = useWatch({ control: form.control, name: "direction" })
  const reasons = direction === "remove" ? removeReasons : addReasons

  const handleSubmit = form.handleSubmit(async ({ direction: chosen, quantity, reason, note }) => {
    try {
      await adjustStock({ clientId, variantId: size.variant.id, quantity: chosen === "remove" ? -quantity : quantity, reason, note })
      toast.success("Stock adjusted", {
        description: `${row.product.name} · ${sizeLabel(size.variant.attributes.size)}: ${chosen === "remove" ? "−" : "+"}${quantity} (${reasons[reason]})`,
      })
      onDone()
    } catch (error) {
      toast.error(error.message)
    }
  })

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <FieldGroup>
        <Controller
          name="direction"
          control={form.control}
          render={({ field }) => (
            <Field>
              <FieldLabel>Change</FieldLabel>
              <Segmented
                options={[
                  { key: "remove", label: "Remove" },
                  { key: "add", label: "Add" },
                ]}
                value={field.value}
                onChange={(value) => {
                  field.onChange(value)
                  form.setValue("reason", "")
                }}
              />
            </Field>
          )}
        />
        <Controller
          name="quantity"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Quantity</FieldLabel>
              <Input {...field} id={field.name} inputMode="numeric" className="w-32 tabular-nums" aria-invalid={fieldState.invalid} />
              <FieldDescription>{onHand} on hand now.</FieldDescription>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="reason"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>Reason</FieldLabel>
              <ToggleGroup aria-label="Reason" variant="solid" size="chip" spacing={1.5} value={field.value ? [field.value] : []} onValueChange={([next]) => next && field.onChange(next)} className="flex-wrap">
                {Object.entries(reasons).map(([key, label]) => (
                  <ToggleGroupItem key={key} value={key} className="h-8">
                    {label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="note"
          control={form.control}
          render={({ field }) => (
            <Field>
              <FieldLabel htmlFor={field.name}>Note (optional)</FieldLabel>
              <Textarea {...field} id={field.name} rows={2} placeholder="e.g. Heel scuffed on display" />
            </Field>
          )}
        />
      </FieldGroup>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" pending={form.formState.isSubmitting}>Save adjustment</Button>
      </DialogFooter>
    </form>
  )
}

export const AdjustStockDialog = ({ row, onClose }) => {
  const stock = useLedgerStore(({ stock }) => stock)
  const [variantId, setVariantId] = useState(null)
  const size = row.sizes.find(({ variant }) => variant.id === variantId)

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust stock</DialogTitle>
          <DialogDescription>
            {row.product.name} · {row.color}. Every adjustment is logged with your name and reason.
          </DialogDescription>
        </DialogHeader>
        <Field>
          <FieldLabel>Size</FieldLabel>
          <ToggleGroup aria-label="Size" variant="chip" size="tile" spacing={1.5} value={variantId ? [variantId] : []} onValueChange={([next]) => next && setVariantId(next)} className="grid w-full grid-cols-4 sm:grid-cols-5">
            {row.sizes.map(({ variant }) => (
              <ToggleGroupItem key={variant.id} value={variant.id} className="h-12 px-0 text-sm aria-pressed:bg-accent aria-pressed:hover:bg-accent">
                <span className="font-semibold tabular-nums">{variant.attributes.size}</span>
                <span className="text-2xs text-muted-foreground tabular-nums">{stock[variant.id] ?? 0} left</span>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          {size && <FieldDescription className="font-mono">Barcode {size.variant.barcode} · SKU {size.variant.sku}</FieldDescription>}
        </Field>
        {size ? (
          <AdjustForm key={size.variant.id} row={row} size={size} onHand={stock[size.variant.id] ?? 0} onDone={onClose} />
        ) : (
          <p className="text-sm text-muted-foreground">Pick the size you are correcting.</p>
        )}
      </DialogContent>
    </Dialog>
  )
}
