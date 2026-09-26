"use client"

import { useState } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowsSplitIcon, CreditCardIcon, DeviceMobileIcon, MoneyIcon, PhoneIcon, UserIcon } from "@phosphor-icons/react"
import { cn } from "cn"
import { Button } from "@/shared/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/shared/components/ui/field"
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/shared/components/ui/input-group"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs"
import { Input } from "@/shared/components/ui/input"
import { Segmented } from "@/shared/components/ui/segmented"
import { REFERENCE_REQUIRED, cashRoundingFor } from "@/features/ledger/lib/rules"
import { formatMoney, toPaisa } from "@/shared/lib/money"
import { hasFinePointer } from "@/shared/lib/pointer"
import { MAX_REFERENCE, referenceError } from "../lib/card-reference"
import { cardEnabled, enabledOtherMethods, methodLabel } from "../lib/payment-methods"
import { MAX_CHANGE, cashTenderSchema, changeTooBig } from "../schemas"
import { useCartStore } from "../store/cart-store-provider"
import { AddReferenceLink, CardReferenceField } from "./card-reference-field"
import { useSettingsFor } from "@/features/shops/hooks/use-shop-scope"

const tabColumns = { 1: "grid-cols-1", 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4" }

const ctaClass = "h-12 w-full whitespace-normal pointer-coarse:h-14"

const quickTenders = (total) => {
  const rupees = total / 100
  return [...new Set([rupees, Math.ceil(rupees / 500) * 500, Math.ceil(rupees / 1000) * 1000, Math.ceil(rupees / 5000) * 5000])]
}

const CashForm = ({ total, rounding, onPay }) => {
  const due = total + rounding
  const form = useForm({ resolver: zodResolver(cashTenderSchema(due)), defaultValues: { tendered: String(due / 100) } })
  const tendered = toPaisa(useWatch({ control: form.control, name: "tendered" }) || 0)
  const change = tendered - due

  const handleSubmit = form.handleSubmit(({ tendered: rupees }) => onPay([{ method: "cash", amount: toPaisa(rupees) }]))

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Controller
        name="tendered"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>Cash received</FieldLabel>
            <InputGroup className="h-12 sm:h-14">
              <InputGroupAddon>
                <InputGroupText>Rs</InputGroupText>
              </InputGroupAddon>
              <InputGroupInput
                {...field}
                id={field.name}
                inputMode="numeric"
                autoFocus={hasFinePointer()}
                className="text-xl font-semibold tabular-nums sm:text-2xl pointer-coarse:text-xl!"
                aria-invalid={fieldState.invalid}
              />
            </InputGroup>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <div className="flex flex-wrap gap-2">
        {quickTenders(due).map((amount, index) => (
          <Button
            key={amount}
            type="button"
            variant="outline"
            size="sm"
            className="min-w-[4.5rem] flex-1 px-2"
            onClick={() => form.setValue("tendered", String(amount), { shouldValidate: true })}
          >
            {index === 0 ? "Exact" : amount.toLocaleString("en-PK")}
          </Button>
        ))}
      </div>
      {rounding < 0 && (
        <p className="text-xs text-muted-foreground">
          Cash due {formatMoney(due)}, rounded down from {formatMoney(total)}.
        </p>
      )}
      <div className="flex items-center justify-between gap-3 border bg-muted/50 px-4 py-3">
        <span className="text-xs font-semibold tracking-label text-muted-foreground uppercase">Change to give</span>
        <span className="shrink-0 font-sans text-xl font-bold text-gold tabular-nums sm:text-2xl">{change >= 0 ? formatMoney(change) : "—"}</span>
      </div>
      <DialogFooter sticky>
        <Button type="submit" size="lg" className={ctaClass}>
          Complete cash sale
        </Button>
      </DialogFooter>
    </form>
  )
}

const CardForm = ({ total, onPay }) => {
  const [showRef, setShowRef] = useState(false)
  const [reference, setReference] = useState("")

  const handleSubmit = (event) => {
    event.preventDefault()
    if (referenceError(reference)) return
    onPay([{ method: "card", amount: total, reference: reference.trim() || null }])
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-3 border bg-muted/40 p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-semibold tracking-label text-muted-foreground uppercase">Amount on terminal</span>
          <span className="shrink-0 font-sans text-xl font-bold text-gold tabular-nums sm:text-2xl">{formatMoney(total)}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <CreditCardIcon className="size-4 shrink-0 text-gold" />
          <span>Tap, insert, or swipe card on the bank POS machine</span>
        </div>
      </div>

      {showRef ? (
        <CardReferenceField
          id="card-reference"
          value={reference}
          onChange={setReference}
          onHide={() => {
            setShowRef(false)
            setReference("")
          }}
        />
      ) : (
        <AddReferenceLink onClick={() => setShowRef(true)} />
      )}

      <DialogFooter sticky>
        <Button type="submit" size="lg" className={ctaClass} disabled={Boolean(referenceError(reference))}>
          Card approved, complete sale
        </Button>
      </DialogFooter>
    </form>
  )
}

const referenceProblem = (method, value) => (REFERENCE_REQUIRED.includes(method) && !value.trim() ? "Enter the transaction ID" : referenceError(value))

const ReferenceInput = ({ id, method, value, onChange }) => (
  <Field>
    <FieldLabel htmlFor={id}>{methodLabel(method)} transaction ID</FieldLabel>
    <Input id={id} value={value} onChange={(event) => onChange(event.target.value.slice(0, MAX_REFERENCE))} placeholder="From the customer's confirmation message" autoComplete="off" className="font-mono" />
  </Field>
)

const OtherForm = ({ total, methods, onPay }) => {
  const [method, setMethod] = useState(methods[0])
  const [reference, setReference] = useState("")
  const problem = referenceProblem(method, reference)

  const handleSubmit = (event) => {
    event.preventDefault()
    if (problem) return
    onPay([{ method, amount: total, reference: reference.trim() }])
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {methods.length > 1 && <Segmented label="Pay with" options={methods.map((key) => ({ key, label: methodLabel(key) }))} value={method} onChange={setMethod} />}
      <div className="flex items-center justify-between gap-3 border bg-muted/40 p-4">
        <span className="text-xs font-semibold tracking-label text-muted-foreground uppercase">Amount to receive</span>
        <span className="shrink-0 font-sans text-xl font-bold text-gold tabular-nums sm:text-2xl">{formatMoney(total)}</span>
      </div>
      <ReferenceInput id="other-reference" method={method} value={reference} onChange={setReference} />
      <DialogFooter sticky>
        <Button type="submit" size="lg" className={ctaClass} disabled={Boolean(problem)}>
          {methodLabel(method)} received, complete sale
        </Button>
      </DialogFooter>
    </form>
  )
}

const getSplitPresets = (totalRupees) => {
  const half = Math.floor(totalRupees / 2)
  const candidates = [1000, 2000, 5000, 10000].filter((amt) => amt > 0 && amt < totalRupees && amt !== half)
  const presets = [{ label: "50 / 50", amount: half }]
  for (const amt of candidates) {
    if (presets.length >= 4) break
    presets.push({ label: amt.toLocaleString("en-PK"), amount: amt })
  }
  return presets
}

const SplitForm = ({ total, methods, onPay }) => {
  const [second, setSecond] = useState(methods[0])
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

  const changeTooLarge = changeTooBig(toPaisa(changeRupees))
  const isValid = cashRupees > 0 && cashRupees < totalRupees && cardRupees > 0 && tenderedRupees >= cashRupees && !changeTooLarge && !referenceProblem(second, reference)

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
      { method: second, amount: cardPaisa, reference: reference.trim() || null },
    ])
  }

  const splitPresets = getSplitPresets(totalRupees)

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {methods.length > 1 && <Segmented label="Rest paid by" options={methods.map((key) => ({ key, label: methodLabel(key) }))} value={second} onChange={setSecond} />}
      <dl className="grid grid-cols-2 divide-x border bg-muted/40">
        <div className="flex min-w-0 flex-col gap-1 p-3">
          <dt className="flex items-center gap-1.5 text-2xs font-semibold tracking-label text-muted-foreground uppercase">
            <MoneyIcon className="size-3.5 shrink-0 text-gold" />
            Cash
          </dt>
          <dd className="truncate font-sans text-xl font-bold text-foreground tabular-nums">{formatMoney(toPaisa(cashRupees))}</dd>
        </div>
        <div className="flex min-w-0 flex-col gap-1 p-3 text-right">
          <dt className="flex items-center justify-end gap-1.5 text-2xs font-semibold tracking-label text-muted-foreground uppercase">
            <CreditCardIcon className="size-3.5 shrink-0 text-gold" />
            {methodLabel(second)}
          </dt>
          <dd className="truncate font-sans text-xl font-bold text-gold tabular-nums">{formatMoney(toPaisa(cardRupees))}</dd>
        </div>
      </dl>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field>
          <div className="flex items-center justify-between gap-2">
            <FieldLabel htmlFor="split-cash-part">Cash to charge</FieldLabel>
            <span className="text-2xs text-muted-foreground tabular-nums">Total {formatMoney(total)}</span>
          </div>
          <InputGroup>
            <InputGroupAddon>
              <InputGroupText>Rs</InputGroupText>
            </InputGroupAddon>
            <InputGroupInput
              id="split-cash-part"
              value={cashPart}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "")
                setCashPart(val)
                if (!tendered || tendered === cashPart) setTendered(val)
              }}
              inputMode="numeric"
              placeholder="0"
              className="font-semibold tabular-nums"
            />
          </InputGroup>
        </Field>

        <Field>
          <div className="flex items-center justify-between gap-2">
            <FieldLabel htmlFor="split-tendered">Cash received</FieldLabel>
            {cashRupees > 0 && tenderedRupees !== cashRupees && (
              <button
                type="button"
                onClick={() => setTendered(String(cashRupees))}
                className="py-0.5 text-xs font-medium text-gold hover:underline pointer-coarse:py-2"
              >
                Exact
              </button>
            )}
          </div>
          <InputGroup>
            <InputGroupAddon>
              <InputGroupText>Rs</InputGroupText>
            </InputGroupAddon>
            <InputGroupInput id="split-tendered" value={tendered} onChange={(e) => setTendered(e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="0" className="font-semibold tabular-nums" />
          </InputGroup>
        </Field>
      </div>

      {splitPresets.length > 0 && (
        <div role="group" aria-label="Quick cash amounts" className="flex flex-wrap gap-2">
          {splitPresets.map(({ label, amount }) => (
            <Button
              key={label}
              type="button"
              variant="outline"
              size="sm"
              aria-pressed={cashRupees === amount}
              className={cn("min-w-[4.5rem] flex-1 px-2", cashRupees === amount && "border-gold/50 bg-gold/15 text-gold hover:bg-gold/20 hover:text-gold")}
              onClick={() => handleQuickCash(amount)}
            >
              {label}
            </Button>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 border bg-muted/40 px-4 py-3">
        <span className="text-xs font-semibold tracking-label text-muted-foreground uppercase">Change to give</span>
        <span className="shrink-0 font-sans text-xl font-bold text-gold tabular-nums">{tenderedRupees >= cashRupees ? formatMoney(toPaisa(changeRupees)) : "—"}</span>
      </div>

      {tenderedRupees > 0 && tenderedRupees < cashRupees && <p className="text-xs text-destructive">Received amount is short by {formatMoney(toPaisa(cashRupees - tenderedRupees))}</p>}
      {changeTooLarge && <p className="text-xs text-destructive">Change would be {formatMoney(MAX_CHANGE)} or more. Check the cash received.</p>}
      {cashRupees >= totalRupees && <p className="text-xs text-warning">Cash covers the full sale. Use the Cash tab or reduce the cash amount.</p>}
      {cashRupees <= 0 && <p className="text-xs text-warning">Enter a cash amount greater than zero.</p>}

      <div className="space-y-3 border p-4">
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <CreditCardIcon className="size-4 shrink-0 text-gold" />
          <span>{second === "card" ? "Take the card amount on the bank terminal first, then complete the sale once it is approved." : `Check the ${methodLabel(second)} payment has arrived before completing the sale.`}</span>
        </p>
        {REFERENCE_REQUIRED.includes(second) ? (
          <ReferenceInput id="split-reference" method={second} value={reference} onChange={setReference} />
        ) : showRef ? (
          <CardReferenceField
            id="split-card-ref"
            value={reference}
            onChange={setReference}
            onHide={() => {
              setShowRef(false)
              setReference("")
            }}
          />
        ) : (
          <AddReferenceLink onClick={() => setShowRef(true)}>+ Add card approval code</AddReferenceLink>
        )}
      </div>

      <DialogFooter sticky>
        <Button type="submit" size="lg" className={ctaClass} disabled={!isValid}>
          Complete split sale
        </Button>
      </DialogFooter>
    </form>
  )
}

export const PaymentDialog = ({ shopId, total, count, onPay, onClose }) => {
  const [method, setMethod] = useState("cash")
  const settings = useSettingsFor(shopId)
  const customerName = useCartStore(({ customerName }) => customerName)
  const customerPhone = useCartStore(({ customerPhone }) => customerPhone)
  const setCustomer = useCartStore(({ setCustomer }) => setCustomer)
  const others = enabledOtherMethods(settings)
  const splitMethods = [...(cardEnabled(settings) ? ["card"] : []), ...others]
  const tabs = [
    ["cash", "Cash", MoneyIcon],
    ...(cardEnabled(settings) ? [["card", "Card", CreditCardIcon]] : []),
    ...(others.length ? [["other", others.length === 1 ? methodLabel(others[0]) : "Wallet / bank", DeviceMobileIcon]] : []),
    ...(splitMethods.length ? [["split", "Split", ArrowsSplitIcon]] : []),
  ]

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="top-4 max-h-[calc(100dvh-2rem)] -translate-y-0 sm:top-[6dvh] sm:max-h-[calc(94dvh-1rem)] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Take payment</DialogTitle>
          <DialogDescription>
            {count} {count === 1 ? "item" : "items"} · total <span className="font-semibold text-gold">{formatMoney(total)}</span>
          </DialogDescription>
        </DialogHeader>

        {settings?.customerInfoEnabled !== false && (
          <div className="min-w-0 space-y-2 border-b pb-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-2xs font-semibold tracking-label text-muted-foreground uppercase">Customer (optional)</span>
              {(customerName || customerPhone) && (
                <button
                  type="button"
                  onClick={() => setCustomer({ name: "", phone: "" })}
                  className="py-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground pointer-coarse:py-2"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="grid min-w-0 grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
              <InputGroup>
                <InputGroupAddon>
                  <UserIcon className="size-3.5 shrink-0 text-gold" />
                </InputGroupAddon>
                <InputGroupInput placeholder="Customer name" value={customerName} onChange={(e) => setCustomer({ name: e.target.value })} autoComplete="off" />
              </InputGroup>
              <InputGroup>
                <InputGroupAddon>
                  <PhoneIcon className="size-3.5 shrink-0 text-gold" />
                </InputGroupAddon>
                <InputGroupInput placeholder="Phone number" type="tel" inputMode="tel" value={customerPhone} onChange={(e) => setCustomer({ phone: e.target.value })} autoComplete="off" />
              </InputGroup>
            </div>
          </div>
        )}

        <Tabs value={method} onValueChange={setMethod}>
          <TabsList className={cn("grid h-10 w-full min-w-0 pointer-coarse:h-12", tabColumns[tabs.length])}>
            {tabs.map(([value, label, Icon]) => (
              <TabsTrigger key={value} value={value} className="min-w-0 gap-1.5 px-2 text-xs pointer-coarse:h-full sm:px-3">
                <Icon className="size-4 shrink-0 text-gold" />
                <span className="truncate">{label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="cash" className="pt-3">
            <CashForm total={total} rounding={cashRoundingFor(total, settings?.cashRounding)} onPay={onPay} />
          </TabsContent>
          <TabsContent value="card" className="pt-3">
            <CardForm total={total} onPay={onPay} />
          </TabsContent>
          <TabsContent value="split" className="pt-3">
            <SplitForm total={total} methods={splitMethods} onPay={onPay} />
          </TabsContent>
          {others.length > 0 && (
            <TabsContent value="other" className="pt-3">
              <OtherForm total={total} methods={others} onPay={onPay} />
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
