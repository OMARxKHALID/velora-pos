"use client"

import { toast } from "sonner"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Segmented } from "@/components/ui/segmented"
import { ArrowCounterClockwiseIcon, LockKeyIcon } from "@phosphor-icons/react"
import { ResetSampleDataDialog } from "@/features/sample-data/components/reset-sample-data-dialog"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group"
import { MAX_CASHIER_DISCOUNT } from "@/features/ledger/lib/rules"
import { supervisorsOf } from "@/features/staff/lib/people"
import { setSupervisorPinAction } from "@/features/staff/actions"
import { useLedgerStore } from "@/features/ledger/store/ledger-store-provider"
import { Panel } from "@/features/analytics/components/panel"

const Toggle = ({ on, onChange, label, description }) => (
  <div className="flex flex-col gap-3 @lg:flex-row @lg:items-start @lg:justify-between">
    <div className="min-w-0 flex-1">
      <p className="text-sm font-medium">{label}</p>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
    <Segmented
      options={[
        { key: "off", label: "Off" },
        { key: "on", label: "On" },
      ]}
      value={on ? "on" : "off"}
      onChange={(value) => onChange(value === "on")}
    />
  </div>
)

const useSyncedDraft = (saved) => {
  const [previous, setPrevious] = useState(saved)
  const [draft, setDraft] = useState(saved)
  if (saved !== previous) {
    setPrevious(saved)
    setDraft(saved)
  }
  return [draft, setDraft]
}

const digitsOnly = (value, length) => value.replace(/\D/g, "").slice(0, length)

const PinRow = ({ person, hasPin }) => {
  const [next, setNext] = useState("")
  const [confirm, setConfirm] = useState("")
  const [saving, setSaving] = useState(false)
  const mismatch = confirm.length === 4 && confirm !== next
  const ready = next.length === 4 && confirm === next && !saving

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!ready) return
    setSaving(true)
    const result = await setSupervisorPinAction(person.id, next).catch(() => ({ error: "Could not reach the server. Check the connection." }))
    setSaving(false)
    if (result.error) return toast.error(result.error)
    setNext("")
    setConfirm("")
    toast.success(`PIN ${hasPin ? "changed" : "set"} for ${person.name}`)
  }

  const input = (id, label, value, setValue, error) => (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <InputGroup>
        <InputGroupInput
          id={id}
          value={value}
          onChange={(event) => setValue(digitsOnly(event.target.value, 4))}
          type="password"
          inputMode="numeric"
          autoComplete="off"
          maxLength={4}
          className="font-mono text-base tracking-[0.3em]"
          aria-invalid={Boolean(error)}
        />
      </InputGroup>
      {error && <FieldError errors={[{ message: error }]} />}
    </Field>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-3 border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">{person.name}</p>
        <span className={hasPin ? "text-xs text-success" : "text-xs text-warning"}>{hasPin ? "PIN set" : "No PIN yet, cannot approve"}</span>
      </div>
      <div className="grid gap-3 @lg:grid-cols-[1fr_1fr_auto] @lg:items-end">
        {input(`pin-${person.id}`, hasPin ? "New PIN" : "PIN", next, setNext, null)}
        {input(`pin-${person.id}-repeat`, "Repeat PIN", confirm, setConfirm, mismatch ? "The PINs do not match" : null)}
        <Button type="submit" size="sm" variant="outline" disabled={!ready}>
          {hasPin ? "Change PIN" : "Set PIN"}
        </Button>
      </div>
    </form>
  )
}

const SupervisorPins = () => {
  const staff = useLedgerStore(({ staff }) => staff)
  const supervisors = supervisorsOf(staff)

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <LockKeyIcon className="size-4 text-gold" />
        <p className="text-sm font-medium">Supervisor approval PINs</p>
      </div>
      {supervisors.length ? (
        supervisors.map((person) => <PinRow key={person.id} person={person} hasPin={Boolean(person.hasPin)} />)
      ) : (
        <p className="text-xs text-muted-foreground">There is no supervisor yet. Add one in Staff.</p>
      )}
      <p className="text-xs text-muted-foreground">
        Each supervisor has their own four-digit PIN, needed whenever a cashier gives a discount above {MAX_CASHIER_DISCOUNT * 100}%. The approval is
        recorded against the supervisor whose PIN was used. PINs are checked on the server and never stored in this browser.
      </p>
    </div>
  )
}

export const SettingsScreen = ({ sampleData = false }) => {
  const settings = useLedgerStore(({ settings }) => settings)
  const setSettings = useLedgerStore(({ setSettings }) => setSettings)
  const [resetOpen, setResetOpen] = useState(false)
  const [rateDraft, setRateDraft] = useSyncedDraft(settings.taxRate ? String(settings.taxRate) : "")
  const [thresholdDraft, setThresholdDraft] = useSyncedDraft(String(settings.lowStockThreshold))

  const update = (patch, message) =>
    setSettings(patch).then(
      () => message && toast.success(message),
      (error) => toast.error(error.message)
    )

  const handleThreshold = (next) => {
    const clean = digitsOnly(next, 2)
    setThresholdDraft(clean)
    const value = Number(clean)
    if (clean !== "" && value >= 1 && value !== settings.lowStockThreshold) update({ lowStockThreshold: value })
  }

  const handleRate = (next) => {
    if (next && !/^(100(\.0{0,2})?|\d{0,2}(\.\d{0,2})?)$/.test(next)) return
    setRateDraft(next)
    const value = next === "" ? 0 : Number(next)
    if (value !== settings.taxRate) update({ taxRate: value })
  }

  const rateValid = rateDraft === "" || (Number.isFinite(Number(rateDraft)) && Number(rateDraft) >= 0 && Number(rateDraft) <= 100)

  return (
    <div className="grid items-start gap-4 @4xl:grid-cols-2">
      <div className="grid gap-4">
        <Panel title="Sales tax" description="Add a tax to every sale, shown on the cart and the receipt.">
          <div className="space-y-5 p-4">
            <Toggle
              on={settings.taxEnabled}
              onChange={(taxEnabled) => update({ taxEnabled }, taxEnabled ? "Sales tax turned on" : "Sales tax turned off")}
              label="Charge sales tax"
              description="When off, no tax is added to any sale."
            />
            {settings.taxEnabled && (
              <div className="space-y-4 border-t pt-4">
                <Field>
                  <FieldLabel>Tax name</FieldLabel>
                  <InputGroup>
                    <InputGroupInput
                      value={settings.taxLabel || ""}
                      onChange={(event) => update({ taxLabel: event.target.value })}
                      placeholder="e.g. Sales tax, GST, VAT"
                      aria-label="Tax name"
                    />
                  </InputGroup>
                </Field>
                <Field data-invalid={!rateValid}>
                  <FieldLabel>Tax rate</FieldLabel>
                  <InputGroup>
                    <InputGroupInput
                      value={rateDraft}
                      onChange={(event) => handleRate(event.target.value)}
                      inputMode="decimal"
                      aria-label="Tax rate percent"
                      aria-invalid={!rateValid}
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupText>%</InputGroupText>
                    </InputGroupAddon>
                  </InputGroup>
                  {!rateValid && <FieldError errors={[{ message: "Enter a number between 0 and 100" }]} />}
                </Field>
                <FieldDescription>Tax is added on top of the total after discounts, on every new sale. Past sales keep their recorded figures.</FieldDescription>
              </div>
            )}
          </div>
        </Panel>

        <Panel title="Checkout & counter" description="Customer details, low-stock warnings and sample data.">
          <div className="space-y-5 p-4">
            <Toggle
              on={settings.customerInfoEnabled !== false}
              onChange={(customerInfoEnabled) =>
                update({ customerInfoEnabled }, customerInfoEnabled ? "Customer details enabled" : "Customer details disabled")
              }
              label="Customer details at checkout"
              description="Collect optional customer name and phone number during checkout for receipt printing and returns."
            />
            <div className="border-t" />
            <div className="space-y-2">
              <Field>
                <div className="flex items-center justify-between">
                  <FieldLabel htmlFor="lowStockThreshold">Low-stock warning threshold</FieldLabel>
                  <span className="text-2xs tracking-wider text-muted-foreground uppercase">Pairs</span>
                </div>
                <InputGroup className="max-w-xs">
                  <InputGroupInput
                    id="lowStockThreshold"
                    value={thresholdDraft}
                    onChange={(event) => handleThreshold(event.target.value)}
                    inputMode="numeric"
                    maxLength={2}
                    placeholder="2"
                    className="font-mono text-sm"
                    aria-label="Low-stock threshold in pairs"
                  />
                  <InputGroupAddon align="inline-end">
                    <InputGroupText>pairs</InputGroupText>
                  </InputGroupAddon>
                </InputGroup>
                <FieldDescription className="text-xs">
                  Sizes at or below this many pairs are flagged as running low in Stock, on the dashboard and when receiving a delivery.
                </FieldDescription>
              </Field>
            </div>
            {sampleData && (
              <>
                <div className="border-t" />
                <div className="flex flex-col gap-3 @lg:flex-row @lg:items-start @lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">Reset sample data</p>
                    <p className="text-xs text-muted-foreground">Restore 30 days of sample sales, stock, shifts, the sample team and these settings.</p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => setResetOpen(true)}>
                    <ArrowCounterClockwiseIcon />
                    Reset data
                  </Button>
                </div>
              </>
            )}
            <p className="text-xs text-muted-foreground">
              Changes take effect immediately at the sales counter and on printed receipts.
            </p>
          </div>
        </Panel>
      </div>

      <Panel title="Discounts" description="Choose which kinds of discount the counter can give.">
        <div className="space-y-5 p-4">
          <Toggle
            on={settings.productDiscountEnabled}
            onChange={(productDiscountEnabled) =>
              update({ productDiscountEnabled }, productDiscountEnabled ? "Product offers on" : "Product offers off")
            }
            label="Product offers"
            description="Per-product discounts you set on each product. They apply automatically at the counter."
          />
          <div className="border-t" />
          <Toggle
            on={settings.cartDiscountEnabled}
            onChange={(cartDiscountEnabled) =>
              update({ cartDiscountEnabled }, cartDiscountEnabled ? "Cart discounts on" : "Cart discounts off")
            }
            label="Discount on the whole cart"
            description="The % off chips on the cart screen. Discounts above the cashier limit still need a supervisor."
          />
          <div className="border-t" />
          <SupervisorPins />
          <p className="text-xs text-muted-foreground">
            Every discount is saved with the sale and appears on the receipt, in sales history and in the owner&apos;s reports.
          </p>
        </div>
      </Panel>

      <p className="text-xs text-muted-foreground @4xl:col-span-2">Pricing changes apply from the next sale. Past sales remain locked in the ledger.</p>
      {sampleData && <ResetSampleDataDialog open={resetOpen} onOpenChange={setResetOpen} />}
    </div>
  )
}