"use client"

import { Controller, useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { MinusIcon, PlusIcon } from "@phosphor-icons/react"
import { cn } from "cn"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"
import { openShiftFor, refundableQuantity } from "@/features/demo/lib/ledger"
import { useDemoStore } from "@/features/demo/store/demo-store-provider"
import { formatMoney } from "@/lib/money"
import { refundReasons, refundRequestSchema } from "../schemas"

const Choice = ({ active, children, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "h-8 border px-3 text-xs transition-colors",
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
  const refundable = Object.fromEntries(sale.items.map(({ variantId }) => [variantId, refundableQuantity({ sales, refunds }, sale.id, variantId)]))
  const selfApprove = user.role !== "cashier"

  const form = useForm({
    resolver: zodResolver(refundRequestSchema),
    defaultValues: {
      lines: sale.items.map(({ variantId }) => ({ variantId, quantity: 0, restock: true })),
      reason: undefined,
      note: "",
      method: sale.payments[0].method === "card" ? "card" : "cash",
    },
  })
  const lines = useWatch({ control: form.control, name: "lines" })
  const reason = useWatch({ control: form.control, name: "reason" })
  const amount = sale.items.reduce((sum, item, index) => sum + Math.round((item.total / item.quantity) * lines[index].quantity), 0)

  const handleSubmit = form.handleSubmit(({ lines: picked, reason: chosen, note, method }) => {
    try {
      const refund = requestRefund({
        saleId: sale.id,
        lines: picked.filter(({ quantity }) => quantity > 0),
        reason: chosen === "Other" ? note : note ? `${chosen}: ${note}` : chosen,
        method,
        requestedBy: user.id,
        shiftId: openShiftFor({ shifts })?.id ?? sale.shiftId,
      })
      if (selfApprove) decideRefund({ refundId: refund.id, approve: true, userId: user.id })
      toast.success(selfApprove ? "Refund approved" : "Refund sent for approval", {
        description: `${formatMoney(refund.total)} · ${sale.number}`,
      })
      onClose()
    } catch (error) {
      toast.error(error.message)
    }
  })

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-5">
          <DialogHeader>
            <DialogTitle>Request refund</DialogTitle>
            <DialogDescription>
              {sale.number}. The original sale stays unchanged; this creates a separate refund record
              {selfApprove ? " approved by you." : " for a manager to approve."}
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
                              <Button type="button" size="icon-xs" variant="outline" aria-label="Less" disabled={field.value < 1} onClick={() => field.onChange(field.value - 1)}>
                                <MinusIcon />
                              </Button>
                              <span className="w-7 text-center text-sm font-semibold tabular-nums">{field.value}</span>
                              <Button type="button" size="icon-xs" variant="outline" aria-label="More" disabled={field.value >= max} onClick={() => field.onChange(field.value + 1)}>
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
                    <Choice active={field.value === "cash"} onClick={() => field.onChange("cash")}>
                      Cash from drawer
                    </Choice>
                    <Choice active={field.value === "card"} onClick={() => field.onChange("card")}>
                      Card reversal
                    </Choice>
                  </div>
                </Field>
              )}
            />
          </FieldGroup>

          <div className="flex items-center justify-between border bg-muted/50 px-4 py-3">
            <span className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">Refund amount</span>
            <span className="font-heading text-2xl font-bold text-gold tabular-nums">{formatMoney(amount)}</span>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">{selfApprove ? "Refund now" : "Send for approval"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
