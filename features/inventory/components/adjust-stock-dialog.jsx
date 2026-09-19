"use client"

import { useState } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { cn } from "cn"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Segmented } from "@/components/ui/segmented"
import { Textarea } from "@/components/ui/textarea"
import { useDemoStore } from "@/features/demo/store/demo-store-provider"
import { addReasons, adjustmentSchema, removeReasons } from "../schemas"

const AdjustForm = ({ row, size, onHand, user, onDone }) => {
  const adjustStock = useDemoStore(({ adjustStock }) => adjustStock)
  const form = useForm({
    resolver: zodResolver(adjustmentSchema(onHand)),
    defaultValues: { direction: "remove", quantity: "1", reason: "", note: "" },
  })
  const direction = useWatch({ control: form.control, name: "direction" })
  const reasons = direction === "remove" ? removeReasons : addReasons

  const handleSubmit = form.handleSubmit(({ direction: chosen, quantity, reason, note }) => {
    try {
      adjustStock({ variantId: size.variant.id, quantity: chosen === "remove" ? -quantity : quantity, reason, note, userId: user.id })
      toast.success("Stock adjusted", {
        description: `${row.product.name} · EU ${size.variant.attributes.size}: ${chosen === "remove" ? "−" : "+"}${quantity} (${reasons[reason]})`,
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
                  { key: "remove", label: "Remove pairs" },
                  { key: "add", label: "Add pairs" },
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
              <FieldLabel htmlFor={field.name}>Pairs</FieldLabel>
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
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(reasons).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => field.onChange(key)}
                    className={cn("h-8 border px-3 text-xs transition-colors pointer-coarse:h-11", field.value === key ? "border-primary bg-primary text-primary-foreground" : "hover:border-primary/60")}
                  >
                    {label}
                  </button>
                ))}
              </div>
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
        <Button type="submit">Save adjustment</Button>
      </DialogFooter>
    </form>
  )
}

export const AdjustStockDialog = ({ row, user, onClose }) => {
  const stock = useDemoStore(({ stock }) => stock)
  const [variantId, setVariantId] = useState(null)
  const size = row.sizes.find(({ variant }) => variant.id === variantId)

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust stock</DialogTitle>
          <DialogDescription>
            {row.product.name} · {row.color}. Every adjustment is logged with your name and reason.
          </DialogDescription>
        </DialogHeader>
        <Field>
          <FieldLabel>Size</FieldLabel>
          <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-5">
            {row.sizes.map(({ variant }) => (
              <button
                key={variant.id}
                type="button"
                onClick={() => setVariantId(variant.id)}
                className={cn(
                  "flex h-12 flex-col items-center justify-center border text-sm transition-colors",
                  variantId === variant.id ? "border-primary bg-accent" : "hover:border-primary/60"
                )}
              >
                <span className="font-semibold tabular-nums">{variant.attributes.size}</span>
                <span className="text-[0.6rem] text-muted-foreground tabular-nums">{stock[variant.id] ?? 0} left</span>
              </button>
            ))}
          </div>
          {size && <FieldDescription className="font-mono">Barcode {size.variant.barcode} · SKU {size.variant.sku}</FieldDescription>}
        </Field>
        {size ? (
          <AdjustForm key={size.variant.id} row={row} size={size} onHand={stock[size.variant.id] ?? 0} user={user} onDone={onClose} />
        ) : (
          <p className="text-sm text-muted-foreground">Pick the size you are correcting.</p>
        )}
      </DialogContent>
    </Dialog>
  )
}
