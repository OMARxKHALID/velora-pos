"use client"

import { toast } from "sonner"
import { useState } from "react"
import { Segmented } from "@/components/ui/segmented"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
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
  const [rateDraft, setRateDraft] = useState(String(settings.taxRate || ""))

  const update = (patch, message) => {
    setSettings(patch)
    if (message) toast.success(message)
  }

  const handleRate = (next) => {
    if (next && !/^\d{0,2}(\.\d{0,2})?$/.test(next)) return
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
                <Input
                  value={settings.taxLabel}
                  onChange={(event) => update({ taxLabel: event.target.value })}
                  placeholder="Sales tax"
                  aria-label="Tax name"
                />
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
          <FieldDescription>
            Every discount is saved with the sale and appears on the receipt, in sales history and in the owner&apos;s reports.
          </FieldDescription>
        </div>
      </Panel>

      <div className="lg:col-span-2">
        <p className="text-xs text-muted-foreground">
          Pricing changes apply from the next sale. Old sales are locked and never change.
        </p>
      </div>
    </div>
  )
}