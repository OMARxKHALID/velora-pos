"use client"

import { useState } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowsSplitIcon, CreditCardIcon, MoneyIcon, PhoneIcon, UserIcon } from "@phosphor-icons/react"
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
  const [showRef, setShowRef] = useState(false)
  const form = useForm({ resolver: zodResolver(cardPaymentSchema), defaultValues: { reference: "" } })

  const handleSubmit = form.handleSubmit(({ reference }) => onPay([{ method: "card", amount: total, reference: reference?.trim() || null }]))

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="border bg-muted/40 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">Amount on terminal</span>
          <span className="font-heading text-2xl font-bold text-gold tabular-nums">{formatMoney(total)}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <CreditCardIcon className="size-4 shrink-0 text-gold" />
          <span>Tap, insert, or swipe card on the bank POS machine</span>
        </div>
      </div>

      {showRef ? (
        <Controller
          name="reference"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <div className="flex items-center justify-between">
                <FieldLabel htmlFor={field.name}>Bank slip approval / auth code</FieldLabel>
                <button
                  type="button"
                  onClick={() => {
                    setShowRef(false)
                    form.setValue("reference", "")
                  }}
                  className="text-[10px] uppercase text-muted-foreground hover:text-foreground"
                >
                  Hide
                </button>
              </div>
              <InputGroup>
                <InputGroupAddon>
                  <InputGroupText>Appr #</InputGroupText>
                </InputGroupAddon>
                <InputGroupInput
                  {...field}
                  id={field.name}
                  placeholder="e.g. 048291"
                  className="font-mono text-xs"
                  aria-invalid={fieldState.invalid}
                />
              </InputGroup>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      ) : (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setShowRef(true)}
            className="text-[11px] uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
          >
            + Add bank slip approval code
          </button>
        </div>
      )}

      <DialogFooter>
        <Button type="submit" size="lg" className="w-full">
          Card approved, complete sale
        </Button>
      </DialogFooter>
    </form>
  )
}

const SplitForm = ({ total, onPay }) => {
  const totalRupees = total / 100
  const defaultCash = Math.floor(totalRupees / 2)
  const [cashPart, setCashPart] = useState(String(defaultCash))
  const [tendered, setTendered] = useState(String(defaultCash))
  const [reference, setReference] = useState("")
  const [showRef, setShowRef] = useState(false)

  const cashRupees = Number(cashPart) || 0
  const tenderedRupees = Number(tendered) || 0
  const cardRupees = Math.max(0, totalRupees - cashRupees)
  const changeRupees = Math.max(0, tenderedRupees - cashRupees)

  const isValid = cashRupees > 0 && cashRupees < totalRupees && cardRupees > 0 && tenderedRupees >= cashRupees

  const handleQuickCash = (amount) => {
    setCashPart(String(amount))
    setTendered(String(amount))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!isValid) return
    const cashPaisa = toPaisa(tenderedRupees)
    const cardPaisa = toPaisa(cardRupees)
    onPay([
      { method: "cash", amount: cashPaisa },
      { method: "card", amount: cardPaisa, reference: reference.trim() || null },
    ])
  }

  // Generate split presets like 50%, Rs 500, Rs 1000, Rs 5000 that are less than total
  const splitPresets = [
    { label: "50 / 50", amount: Math.floor(totalRupees / 2) },
    { label: "1,000", amount: 1000 },
    { label: "2,000", amount: 2000 },
    { label: "5,000", amount: 5000 },
  ].filter(({ amount }) => amount > 0 && amount < totalRupees)

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="border bg-muted/40 p-3.5 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">Card on terminal</span>
          <span className="font-heading text-xl sm:text-2xl font-bold text-gold tabular-nums">{formatMoney(toPaisa(cardRupees))}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <CreditCardIcon className="size-4 shrink-0 text-gold" />
          <span>Swipe or tap {formatMoney(toPaisa(cardRupees))} on bank card machine</span>
        </div>
      </div>

      <div className="space-y-3">
        <Field>
          <div className="flex items-center justify-between">
            <FieldLabel htmlFor="split-cash-part">Cash portion</FieldLabel>
            <span className="text-xs text-muted-foreground tabular-nums">
              Total: {formatMoney(total)}
            </span>
          </div>
          <InputGroup className="h-12 sm:h-14">
            <InputGroupAddon>
              <InputGroupText>Rs</InputGroupText>
            </InputGroupAddon>
            <InputGroupInput
              id="split-cash-part"
              value={cashPart}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "")
                setCashPart(val)
                setTendered(val)
              }}
              inputMode="numeric"
              placeholder="e.g. 5000"
              className="text-xl sm:text-2xl font-semibold tabular-nums"
            />
          </InputGroup>
        </Field>

        <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
          {splitPresets.map(({ label, amount }) => (
            <Button
              key={label}
              type="button"
              variant="outline"
              size="sm"
              className="h-9 text-xs font-semibold touch-manipulation pointer-coarse:h-11 active:scale-95"
              onClick={() => handleQuickCash(amount)}
            >
              {label}
            </Button>
          ))}
        </div>

        <Field>
          <FieldLabel htmlFor="split-tendered">Cash received (tendered)</FieldLabel>
          <InputGroup className="h-11 sm:h-12">
            <InputGroupAddon>
              <InputGroupText>Rs</InputGroupText>
            </InputGroupAddon>
            <InputGroupInput
              id="split-tendered"
              value={tendered}
              onChange={(e) => setTendered(e.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              placeholder="e.g. 5000"
              className="text-lg sm:text-xl font-semibold tabular-nums"
            />
          </InputGroup>
        </Field>

        <div className="flex items-center justify-between border bg-muted/50 px-4 py-2.5 sm:py-3">
          <span className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">Change to give</span>
          <span className="font-heading text-xl sm:text-2xl font-bold text-gold tabular-nums">
            {tenderedRupees >= cashRupees ? formatMoney(toPaisa(changeRupees)) : "—"}
          </span>
        </div>

        {showRef ? (
          <Field>
            <div className="flex items-center justify-between">
              <FieldLabel htmlFor="split-card-ref">Bank slip approval / auth code</FieldLabel>
              <button
                type="button"
                onClick={() => {
                  setShowRef(false)
                  setReference("")
                }}
                className="text-[10px] uppercase text-muted-foreground hover:text-foreground"
              >
                Hide
              </button>
            </div>
            <InputGroup className="h-9">
              <InputGroupAddon>
                <InputGroupText>Appr #</InputGroupText>
              </InputGroupAddon>
              <InputGroupInput
                id="split-card-ref"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. 091823"
                className="font-mono text-xs"
              />
            </InputGroup>
          </Field>
        ) : (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowRef(true)}
              className="text-[11px] uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
            >
              + Add card approval code
            </button>
          </div>
        )}
      </div>

      <DialogFooter>
        <Button
          type="submit"
          size="lg"
          className="h-12 sm:h-14 w-full touch-manipulation pointer-coarse:h-14 text-sm font-semibold active:scale-95"
          disabled={!isValid}
        >
          Complete split sale ({formatMoney(toPaisa(cashRupees))} cash + {formatMoney(toPaisa(cardRupees))} card)
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
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-md [scrollbar-width:thin] p-4 sm:p-6">
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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="cash">
              <MoneyIcon />
              Cash
            </TabsTrigger>
            <TabsTrigger value="card">
              <CreditCardIcon />
              Card
            </TabsTrigger>
            <TabsTrigger value="split">
              <ArrowsSplitIcon />
              Split
            </TabsTrigger>
          </TabsList>
          <TabsContent value="cash" className="pt-4">
            <CashForm total={total} onPay={onPay} />
          </TabsContent>
          <TabsContent value="card" className="pt-4">
            <CardForm total={total} onPay={onPay} />
          </TabsContent>
          <TabsContent value="split" className="pt-4">
            <SplitForm total={total} onPay={onPay} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
