"use client"

import { useState } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { cn } from "cn"
import { Button } from "@/shared/components/ui/button"
import { QuantityStepper } from "@/shared/components/ui/quantity-stepper"
import { ToggleGroup, ToggleGroupItem } from "@/shared/components/ui/toggle-group"
import { Checkbox } from "@/shared/components/ui/checkbox"
import { Label } from "@/shared/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/shared/components/ui/field"
import { Textarea } from "@/shared/components/ui/textarea"
import { openShiftFor, previewRefund, refundCapFor, refundMethodsFor, refundableQuantity } from "@/features/ledger/lib/rules"
import { useLedgerStore } from "@/features/ledger/store/ledger-store-provider"
import { newId } from "@/shared/lib/id"
import { formatMoney } from "@/shared/lib/money"
import { OTHER_REASON, reasonOptions, refundRequestSchema } from "../schemas"
import { useSettingsFor } from "@/features/shops/hooks/use-shop-scope"
import { sizeLabel } from "@/features/catalog/lib/catalog"

const methodLabels = { cash: "Cash from drawer", card: "Card reversal", jazzcash: "Back to JazzCash", easypaisa: "Back to Easypaisa", bank: "Bank transfer back" }

const Choices = ({ label, options, value, onChange }) => (
  <ToggleGroup aria-label={label} variant="solid" size="chip" spacing={1.5} value={value ? [value] : []} onValueChange={([next]) => next && onChange(next)} className="flex-wrap">
    {options.map(([key, text]) => (
      <ToggleGroupItem key={key} value={key}>
        {text}
      </ToggleGroupItem>
    ))}
  </ToggleGroup>
)

export const RefundRequestDialog = ({ sale, refunds, user, onClose }) => {
  const exchanges = useLedgerStore(({ exchanges }) => exchanges)
  const shifts = useLedgerStore(({ shifts }) => shifts)
  const requestRefund = useLedgerStore(({ requestRefund }) => requestRefund)
  const decideRefund = useLedgerStore(({ decideRefund }) => decideRefund)
  const state = { sales: [sale], refunds, exchanges }
  const refundable = Object.fromEntries(sale.items.map(({ variantId }) => [variantId, refundableQuantity(state, sale.id, variantId)]))
  const selfApprove = user.role !== "cashier"
  const methods = refundMethodsFor(sale)
  const [clientId] = useState(newId)
  const settings = useSettingsFor(sale.shopId)
  const reasons = reasonOptions(settings)

  const form = useForm({
    resolver: zodResolver(refundRequestSchema(reasons)),
    defaultValues: {
      lines: sale.items.map(({ variantId }) => ({ variantId, quantity: 0, restock: settings.restockReturns !== false })),
      reason: undefined,
      note: "",
      method: methods[0],
    },
  })
  const lines = useWatch({ control: form.control, name: "lines" })
  const reason = useWatch({ control: form.control, name: "reason" })
  const method = useWatch({ control: form.control, name: "method" })
  const quote = previewRefund(state, sale.id, lines)
  const overCap = quote.total > refundCapFor(state, sale, method)
  const openShift = openShiftFor({ shifts })
  const approveNow = selfApprove && (method !== "cash" || Boolean(openShift))

  const handleSubmit = form.handleSubmit(async ({ lines: picked, reason: chosen, note, method }) => {
    try {
      const refund = await requestRefund({
        saleId: sale.id,
        lines: picked.filter(({ quantity }) => quantity > 0),
        reason: chosen === OTHER_REASON ? note : note ? `${chosen}: ${note}` : chosen,
        method,
        clientId,
      })
      if (approveNow) await decideRefund({ refundId: refund.id, approve: true })
      toast.success(approveNow ? "Return approved" : "Return sent for approval", {
        description: approveNow || !selfApprove ? `${formatMoney(refund.total)} · ${sale.number}` : "No counter shift is open. Approve it in Returns once a cashier opens one.",
      })
      onClose()
    } catch (error) {
      toast.error(error.message)
    }
  })

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-5">
          <DialogHeader>
            <DialogTitle>Request return</DialogTitle>
            <DialogDescription>
              {sale.number}. The original sale stays unchanged; this creates a separate return record
              {approveNow ? " approved by you." : selfApprove ? ". No counter shift is open, so cash waits in Returns until one is." : " for a supervisor to approve."}
            </DialogDescription>
          </DialogHeader>

          <FieldGroup>
            <Field data-invalid={!!form.formState.errors.lines}>
              <FieldLabel>Items to return</FieldLabel>
              <ul className="divide-y border">
                {sale.items.map((item, index) => {
                  const max = refundable[item.variantId]
                  return (
                    <li key={item.variantId} className={cn("space-y-2 p-3", !max && "opacity-45")}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{item.productName}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.attributes.color} · {sizeLabel(item.attributes.size)} · {max ? `${max} refundable` : "nothing left to return"}
                          </p>
                        </div>
                        <Controller
                          name={`lines.${index}.quantity`}
                          control={form.control}
                          render={({ field }) => (
                            <QuantityStepper value={field.value} max={max} onChange={field.onChange} />
                          )}
                        />
                      </div>
                      {lines[index].quantity > 0 && (
                        <Controller
                          name={`lines.${index}.restock`}
                          control={form.control}
                          render={({ field }) => (
                            <Label className="text-xs font-normal text-muted-foreground">
                              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                              Put back in stock (only if it can be sold again)
                            </Label>
                          )}
                        />
                      )}
                    </li>
                  )
                })}
              </ul>
              {form.formState.errors.lines && <FieldError errors={[form.formState.errors.lines.root ?? form.formState.errors.lines]} />}
            </Field>

            <Controller
              name="reason"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Reason</FieldLabel>
                  <Choices label="Reason" options={reasons.map((option) => [option, option])} value={field.value} onChange={field.onChange} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Controller
              name="note"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>{reason === OTHER_REASON ? "Describe the reason" : "Note (optional)"}</FieldLabel>
                  <Textarea {...field} id={field.name} rows={2} aria-invalid={fieldState.invalid} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Controller
              name="method"
              control={form.control}
              render={({ field }) => (
                <Field>
                  <FieldLabel>Refund to</FieldLabel>
                  <Choices label="Refund to" options={methods.map((option) => [option, methodLabels[option]])} value={field.value} onChange={field.onChange} />
                  <FieldDescription>Money goes back the way it was paid.</FieldDescription>
                  {overCap && <FieldError errors={[{ message: `That is more than was paid by ${field.value}. Refund the rest through the other method.` }]} />}
                </Field>
              )}
            />
          </FieldGroup>

          <div className="space-y-1 border bg-muted/50 px-4 py-3">
            {quote.taxTotal > 0 && (
              <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
                <span>Goods {formatMoney(quote.amount)}</span>
                <span>Tax {formatMoney(quote.taxTotal)}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold tracking-label text-muted-foreground uppercase">Refund amount</span>
              <span className="font-sans text-2xl font-bold text-gold tabular-nums">{formatMoney(quote.total)}</span>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={overCap} pending={form.formState.isSubmitting}>
              {approveNow ? "Approve return" : "Send for approval"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
