"use client"

import { ArrowCounterClockwiseIcon } from "@phosphor-icons/react"
import { Button } from "@/shared/components/ui/button"
import { Field, FieldDescription, FieldLabel, FieldLegend, FieldSet } from "@/shared/components/ui/field"
import { Input } from "@/shared/components/ui/input"
import { Segmented } from "@/shared/components/ui/segmented"
import { Separator } from "@/shared/components/ui/separator"
import { Textarea } from "@/shared/components/ui/textarea"
import { Panel } from "@/shared/components/ui/panel"
import { useLedgerStore } from "@/features/ledger/store/ledger-store-provider"
import { Receipt } from "@/features/pos/components/receipt"
import { receiptDefaults, receiptDesign, sampleSale } from "@/features/pos/lib/receipt-design"
import { SettingToggle } from "./setting-toggle"

const papers = [
  { key: "80", label: "80 mm" },
  { key: "58", label: "58 mm" },
]

const textSizes = [
  { key: "small", label: "Small" },
  { key: "normal", label: "Normal" },
  { key: "large", label: "Large" },
]

const titleStyles = [
  { key: "brand", label: "Brand letters" },
  { key: "plain", label: "Plain" },
]

const sections = [
  {
    legend: "Header",
    texts: [
      ["title", "Brand at the top", "VELORA", 40, false],
      ["tagline", "Line under the brand", "Fashion · Footwear · Lifestyle", 60, false],
      ["headerNote", "Note under the address", "Open daily 11 am to 10 pm", 120, true],
    ],
    toggles: [
      ["showShopName", "Shop name"],
      ["showAddress", "Shop address"],
      ["showPhone", "Shop phone"],
    ],
    hint: "The shop name, address and phone come from each shop in the Shops tab.",
  },
  {
    legend: "Sale details",
    toggles: [
      ["showCashier", "Cashier name"],
      ["showCustomer", "Customer name and phone"],
    ],
  },
  {
    legend: "Items",
    toggles: [
      ["showColorSize", "Colour and size under each item"],
      ["showLineDiscounts", "Offer and discount under each item", "The total discount is always shown with the totals."],
    ],
  },
  {
    legend: "Footer",
    toggles: [
      ["showReturnDeadline", "Last day for returns", "Printed from the time limit in the Returns tab."],
      ["showBarcode", "Receipt barcode for returns"],
    ],
    texts: [
      ["policy", "Return policy", "Shoes must be unworn and in the original box", 400, true],
      ["footer", "Closing message", "Thank you for shopping with us", 160, true],
    ],
  },
]

const TextSetting = ({ name, label, placeholder, max, multiline, value, onChange }) => {
  const id = `receipt-${name}`
  const Control = multiline ? Textarea : Input
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Control id={id} rows={multiline ? 2 : undefined} value={value} maxLength={max} onChange={(event) => onChange(event.target.value.slice(0, max))} placeholder={placeholder} />
    </Field>
  )
}

export const ReceiptDesigner = ({ settings, update, shopId = null, scopeBar = null }) => {
  const firstShopId = useLedgerStore(({ shops }) => shops[0]?.id)
  const sample = sampleSale(shopId ?? firstShopId)
  const design = receiptDesign(settings)

  const change = (patch) => update({ receipt: { ...design, ...patch } })

  return (
    <div className="grid items-start gap-4 @4xl:grid-cols-[minmax(0,1fr)_auto]">
      {scopeBar}
      <Panel
        title="Receipt design"
        description="What every printed receipt shows. Changes apply to new prints and reprints straight away."
        action={
          <Button type="button" size="sm" variant="ghost" onClick={() => update({ receipt: receiptDefaults }, "Receipt back to the default design")}>
            <ArrowCounterClockwiseIcon />
            Default
          </Button>
        }
      >
        <div className="space-y-6 p-4">
          <FieldSet>
            <FieldLegend>Paper and text</FieldLegend>
            <div className="grid gap-4 @lg:grid-cols-3">
              <Field>
                <FieldLabel>Paper width</FieldLabel>
                <Segmented label="Paper width" options={papers} value={design.paper} onChange={(paper) => change({ paper })} />
              </Field>
              <Field>
                <FieldLabel>Text size</FieldLabel>
                <Segmented label="Text size" options={textSizes} value={design.textSize} onChange={(textSize) => change({ textSize })} />
              </Field>
              <Field>
                <FieldLabel>Brand style</FieldLabel>
                <Segmented label="Brand style" options={titleStyles} value={design.titleStyle} onChange={(titleStyle) => change({ titleStyle })} />
              </Field>
            </div>
            <FieldDescription>Match the paper to the roll in the receipt printer.</FieldDescription>
          </FieldSet>

          {sections.map(({ legend, texts = [], toggles, hint }) => (
            <div key={legend} className="space-y-6">
              <Separator />
              <FieldSet>
                <FieldLegend>{legend}</FieldLegend>
                {texts.length > 0 && (
                  <div className="grid gap-4 @lg:grid-cols-2">
                    {texts.map(([name, label, placeholder, max, multiline]) => (
                      <TextSetting key={name} name={name} label={label} placeholder={placeholder} max={max} multiline={multiline} value={design[name]} onChange={(value) => change({ [name]: value })} />
                    ))}
                  </div>
                )}
                <div className="space-y-4">
                  {toggles.map(([name, label, description]) => (
                    <SettingToggle key={name} on={design[name]} onChange={(value) => change({ [name]: value })} label={label} description={description} />
                  ))}
                </div>
                {hint && <FieldDescription>{hint}</FieldDescription>}
              </FieldSet>
            </div>
          ))}

          <Separator />
          <FieldDescription>Tax lines, the FBR number, QR code, NTN and STRN are always printed when they apply, because the law asks for them.</FieldDescription>
        </div>
      </Panel>

      <div className="space-y-2 @4xl:sticky @4xl:top-20">
        <p className="text-xs font-medium text-muted-foreground">Preview</p>
        <div className="overflow-x-auto border bg-muted/40 p-4">
          <Receipt sale={sample} design={design} />
        </div>
      </div>
    </div>
  )
}
