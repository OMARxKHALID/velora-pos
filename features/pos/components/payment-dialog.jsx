"use client"

import { useState } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { CreditCardIcon, MoneyIcon, PhoneIcon, UserIcon } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useDemoStore } from "@/features/demo/store/demo-store-provider"
import { formatMoney, toPaisa } from "@/lib/money"
import { cardPaymentSchema, cashTenderSchema } from "../schemas"
import { useCartStore } from "../store/cart-store-provider"

const quickTenders = (total) => {
  const rupees = total / 100
  return [...new Set([rupees, Math.ceil(rupees / 500) * 500, Math.ceil(rupees / 1000) * 1000, Math.ceil(rupees / 5000) * 5000])]
}

const CashForm = ({ total, onPay }) => {
  const form = useForm({ resolver: zodResolver(cashTenderSchema(total)), defaultValues: { tendered: String(total / 100) } })
  const tendered = toPaisa(useWatch({ control: form.control, name: "tendered" }) || 0)
  const change = tendered - total

  const handleSubmit = form.handleSubmit(({ tendered: rupees }) => onPay([{ method: "cash", amount: toPaisa(rupees) }]))

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Controller
        name="tendered"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>Cash received</FieldLabel>
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
      <div className="grid grid-cols-4 gap-2">
        {quickTenders(total).map((amount, index) => (
          <Button key={amount} type="button" variant="outline" size="sm" onClick={() => form.setValue("tendered", String(amount), { shouldValidate: true })}>
            {index === 0 ? "Exact" : amount.toLocaleString("en-PK")}
          </Button>
        ))}
      </div>
      <div className="flex items-center justify-between border bg-muted/50 px-4 py-3">
        <span className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">Change to give</span>
        <span className="font-heading text-2xl font-bold text-gold tabular-nums">{change >= 0 ? formatMoney(change) : "—"}</span>
      </div>
      <DialogFooter>
        <Button type="submit" size="lg" className="w-full">
          Complete cash sale
        </Button>
      </DialogFooter>
    </form>
  )
}

const CardForm = ({ total, onPay }) => {
  const form = useForm({ resolver: zodResolver(cardPaymentSchema), defaultValues: { reference: "" } })

  const handleSubmit = form.handleSubmit(({ reference }) => onPay([{ method: "card", amount: total, reference: reference || null }]))

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between border bg-muted/50 px-4 py-3">
        <span className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">Charge on terminal</span>
        <span className="font-heading text-2xl font-bold text-gold tabular-nums">{formatMoney(total)}</span>
      </div>
      <Controller
        name="reference"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>Card last 4 digits (optional)</FieldLabel>
            <InputGroup>
              <InputGroupAddon>
                <InputGroupText>•••• </InputGroupText>
              </InputGroupAddon>
              <InputGroupInput {...field} id={field.name} inputMode="numeric" maxLength={4} aria-invalid={fieldState.invalid} />
            </InputGroup>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <DialogFooter>
        <Button type="submit" size="lg" className="w-full">
          Card approved, complete sale
        </Button>
      </DialogFooter>
    </form>
  )
}

export const PaymentDialog = ({ total, count, onPay, onClose }) => {
  const [method, setMethod] = useState("cash")
  const settings = useDemoStore(({ settings }) => settings)
  const customerName = useCartStore(({ customerName }) => customerName)
  const customerPhone = useCartStore(({ customerPhone }) => customerPhone)
  const setCustomer = useCartStore(({ setCustomer }) => setCustomer)

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Take payment</DialogTitle>
          <DialogDescription>
            {count} {count === 1 ? "item" : "items"} · total <span className="font-semibold text-gold">{formatMoney(total)}</span>
          </DialogDescription>
        </DialogHeader>

        {settings?.customerInfoEnabled !== false && (
          <div className="space-y-2 border-b pb-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                Customer (optional)
              </span>
              {(customerName || customerPhone) && (
                <button
                  type="button"
                  onClick={() => setCustomer({ name: "", phone: "" })}
                  className="text-[10px] tracking-wider text-muted-foreground uppercase transition-colors hover:text-foreground"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <InputGroup className="h-9">
                <InputGroupAddon>
                  <UserIcon className="size-3.5 text-gold" />
                </InputGroupAddon>
                <InputGroupInput
                  placeholder="Customer name"
                  value={customerName}
                  onChange={(e) => setCustomer({ name: e.target.value })}
                  className="text-xs"
                />
              </InputGroup>
              <InputGroup className="h-9">
                <InputGroupAddon>
                  <PhoneIcon className="size-3.5 text-gold" />
                </InputGroupAddon>
                <InputGroupInput
                  placeholder="Phone number"
                  value={customerPhone}
                  onChange={(e) => setCustomer({ phone: e.target.value })}
                  className="text-xs"
                />
              </InputGroup>
            </div>
          </div>
        )}

        <Tabs value={method} onValueChange={setMethod}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="cash">
              <MoneyIcon />
              Cash
            </TabsTrigger>
            <TabsTrigger value="card">
              <CreditCardIcon />
              Card
            </TabsTrigger>
          </TabsList>
          <TabsContent value="cash" className="pt-4">
            <CashForm total={total} onPay={onPay} />
          </TabsContent>
          <TabsContent value="card" className="pt-4">
            <CardForm total={total} onPay={onPay} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
