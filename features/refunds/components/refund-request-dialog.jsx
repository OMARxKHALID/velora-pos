"use client"

import { useState } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { MinusIcon, PlusIcon } from "@phosphor-icons/react"
import { cn } from "cn"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"
import { openShiftFor, previewRefund, refundCapFor, refundMethodsFor, refundableQuantity } from "@/features/demo/lib/ledger"
import { useDemoStore } from "@/features/demo/store/demo-store-provider"
import { newId } from "@/lib/id"
import { formatMoney } from "@/lib/money"
import { refundReasons, refundRequestSchema } from "../schemas"

const methodLabels = { cash: "Cash from drawer", card: "Card reversal" }

const Choice = ({ active, children, onClick }) => (
  <button
    type="button"
    aria-pressed={active}
    onClick={onClick}
    className={cn(
      "h-9 border px-3 text-xs transition-colors pointer-coarse:h-11",
      active ? "border-primary bg-primary text-primary-foreground" : "hover:border-primary/60"
    )}
  >
    {children}
  </button>
)

export const RefundRequestDialog = ({ sale, user, onClose }) => {
  const sales = useDemoStore(({ sales }) => sales)
  const refunds = useDemoStore(({ refunds }) => refunds)
  const shifts = useDemoStore(({ shifts }) => shifts)
  const requestRefund = useDemoStore(({ requestRefund }) => requestRefund)
  const decideRefund = useDemoStore(({ decideRefund }) => decideRefund)
  const state = { sales, refunds }
  const refundable = Object.fromEntries(sale.items.map(({ variantId }) => [variantId, refundableQuantity(state, sale.id, variantId)]))
  const selfApprove = user.role !== "cashier"
  const methods = refundMethodsFor(sale)
  const [clientId] = useState(newId)

  const form = useForm({
    resolver: zodResolver(refundRequestSchema),
    defaultValues: {
      lines: sale.items.map(({ variantId }) => ({ variantId, quantity: 0, restock: true })),
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

  const handleSubmit = form.handleSubmit(({ lines: picked, reason: chosen, note, method }) => {
    try {
      const refund = requestRefund({
        saleId: sale.id,
        lines: picked.filter(({ quantity }) => quantity > 0),
        reason: chosen === "Other" ? note : note ? `${chosen}: ${note}` : chosen,
        method,
        requestedBy: user.id,
        shiftId: openShift?.id ?? sale.shiftId,
        clientId,
      })
      if (approveNow) decideRefund({ refundId: refund.id, approve: true, userId: user.id })
      toast.success(approveNow ? "Refund approved" : "Refund sent for approval", {
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
            <DialogTitle>Request refund</DialogTitle>
            <DialogDescription>
              {sale.number}. The original sale stays unchanged; this creates a separate refund record
              {approveNow ? " approved by you." : selfApprove ? ". No counter shift is open, so cash waits in Returns until one is." : " for a supervisor to approve."}
            </DialogDescription>
          </DialogHeader>

          <FieldGroup>
            <Field data-invalid={!!form.formState.errors.lines}>
              <FieldLabel>Items to refund</FieldLabel>
              <ul className="divide-y border">
                {sale.items.map((item, index) => {
                  const max = refundable[item.variantId]
                  return (
                    <li key={item.variantId} className={cn("space-y-2 p-3", !max && "opacity-45")}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{item.productName}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.attributes.color} · EU {item.attributes.size} · {max ? `${max} refundable` : "already refunded"}
                          </p>
                        </div>
                        <Controller
                          name={`lines.${index}.quantity`}
                          control={form.control}
                          render={({ field }) => (
                            <div className="flex shrink-0 items-center gap-1">
                              <Button type="button" size="icon-sm" variant="outline" aria-label="Less" disabled={field.value < 1} onClick={() => field.onChange(field.value - 1)}>
                                <MinusIcon />
                              </Button>
                              <span className="w-7 text-center text-sm font-semibold tabular-nums">{field.value}</span>
                              <Button type="button" size="icon-sm" variant="outline" aria-label="More" disabled={field.value >= max} onClick={() => field.onChange(field.value + 1)}>
                                <PlusIcon />
                              </Button>
                            </div>
                          )}
                        />
                      </div>
                      {lines[index].quantity > 0 && (
                        <Controller
                          name={`lines.${index}.restock`}
                          control={form.control}
                          render={({ field }) => (
                            <label className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                              Put back in stock (untick if damaged)
                            </label>
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
                  <div className="flex flex-wrap gap-1.5">
                    {refundReasons.map((option) => (
                      <Choice key={option} active={field.value === option} onClick={() => field.onChange(option)}>
                        {option}
                      </Choice>
                    ))}
                  </div>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Controller
              name="note"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>{reason === "Other" ? "Describe the reason" : "Note (optional)"}</FieldLabel>
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
                  <div className="flex gap-1.5">
                    {methods.map((option) => (
                      <Choice key={option} active={field.value === option} onClick={() => field.onChange(option)}>
                        {methodLabels[option]}
                      </Choice>
                    ))}
                  </div>
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
            <Button type="submit" disabled={overCap}>
              {approveNow ? "Refund now" : "Send for approval"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
