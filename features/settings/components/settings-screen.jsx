"use client"

import { toast } from "sonner"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Segmented } from "@/components/ui/segmented"
import { LockKeyIcon } from "@phosphor-icons/react"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group"
import { useDemoStore } from "@/features/demo/store/demo-store-provider"
import { Panel } from "@/features/analytics/components/panel"

const Toggle = ({ on, onChange, label, description }) => (
  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
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

export const SettingsScreen = () => {
  const settings = useDemoStore(({ settings }) => settings)
  const setSettings = useDemoStore(({ setSettings }) => setSettings)
  const resetDemo = useDemoStore(({ resetDemo }) => resetDemo)
  const [prevTaxRate, setPrevTaxRate] = useState(settings.taxRate)
  const [rateDraft, setRateDraft] = useState(String(settings.taxRate || ""))
  const [prevPin, setPrevPin] = useState(settings.managerPin || "1234")
  const [pinDraft, setPinDraft] = useState(settings.managerPin || "1234")
  const [prevThreshold, setPrevThreshold] = useState(settings.lowStockThreshold ?? 2)
  const [thresholdDraft, setThresholdDraft] = useState(String(settings.lowStockThreshold ?? 2))

  if (settings.taxRate !== prevTaxRate) {
    setPrevTaxRate(settings.taxRate)
    setRateDraft(settings.taxRate ? String(settings.taxRate) : "")
  }

  if ((settings.managerPin || "1234") !== prevPin) {
    setPrevPin(settings.managerPin || "1234")
    setPinDraft(settings.managerPin || "1234")
  }

  if ((settings.lowStockThreshold ?? 2) !== prevThreshold) {
    setPrevThreshold(settings.lowStockThreshold ?? 2)
    setThresholdDraft(String(settings.lowStockThreshold ?? 2))
  }

  const update = (patch, message) => {
    setSettings(patch)
    if (message) toast.success(message)
  }

  const handleThreshold = (next) => {
    const clean = next.replace(/\D/g, "").slice(0, 2)
    setThresholdDraft(clean)
    const val = Number(clean)
    if (clean !== "" && Number.isFinite(val) && val >= 1 && val !== settings.lowStockThreshold) {
      update({ lowStockThreshold: val })
    }
  }

  const handlePin = (next) => {
    const clean = next.replace(/\D/g, "").slice(0, 4)
    setPinDraft(clean)
    if (clean.length === 4 && clean !== settings.managerPin) {
      update({ managerPin: clean }, "Supervisor PIN updated")
    }
  }

  const handleRate = (next) => {
    if (next && !/^(100(\.0{0,2})?|\d{0,2}(\.\d{0,2})?)$/.test(next)) return
    setRateDraft(next)
    const value = next === "" ? 0 : Number(next)
    if (value !== settings.taxRate) update({ taxRate: value })
  }

  const rateValid = rateDraft === "" || (Number.isFinite(Number(rateDraft)) && Number(rateDraft) >= 0 && Number(rateDraft) <= 100)

  return (
    <div className="grid gap-4 lg:grid-cols-2">
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
            description="The % off chips on the cart screen. Big discounts still need a supervisor."
          />
          <div className="border-t" />
          <div className="space-y-2">
            <Field>
              <div className="flex items-center justify-between">
                <FieldLabel htmlFor="managerPin">Supervisor approval PIN</FieldLabel>
                <span className="text-[10px] tracking-wider text-muted-foreground uppercase">4-digit PIN</span>
              </div>
              <InputGroup className="max-w-xs">
                <InputGroupAddon>
                  <LockKeyIcon className="size-4 text-gold" />
                </InputGroupAddon>
                <InputGroupInput
                  id="managerPin"
                  value={pinDraft}
                  onChange={(event) => handlePin(event.target.value)}
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="1234"
                  className="font-mono text-base tracking-[0.3em]"
                  aria-label="Supervisor approval PIN"
                />
              </InputGroup>
              <FieldDescription>
                Supervisor PIN required whenever a cashier applies discounts higher than 5% at checkout.
              </FieldDescription>
            </Field>
          </div>
          <FieldDescription>
            Every discount is saved with the sale and appears on the receipt, in sales history and in the owner&apos;s reports.
          </FieldDescription>
        </div>
      </Panel>

      <Panel title="Checkout & counter" description="Configure counter behavior, receipt details, and demo data.">
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
                <span className="text-[10px] tracking-wider text-muted-foreground uppercase">Pairs</span>
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
              <FieldDescription>
                Sizes with remaining inventory at or below this limit are highlighted in amber across stock lists.
              </FieldDescription>
            </Field>
          </div>
          <div className="border-t" />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Reset demo data</p>
              <p className="text-xs text-muted-foreground">
                Restore 30 days of clean seeded sales, inventory, and shifts.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                resetDemo()
                toast.success("Demo data reset", { description: "30 days of fresh sales, shifts and refunds." })
              }}
            >
              Reset data
            </Button>
          </div>
          <FieldDescription>
            Changes take effect immediately at the sales counter and on printed receipts.
          </FieldDescription>
        </div>
      </Panel>

      <div className="flex items-center lg:col-span-2">
        <p className="text-xs text-muted-foreground">
          Pricing changes apply from the next sale. Past sales remain locked in the ledger.
        </p>
      </div>
    </div>
  )
}